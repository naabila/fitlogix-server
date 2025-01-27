const express = require('express')
const app = express();
const port = process.env.PORT||3000;
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// middleware
app.use(cors({
  origin: 'http://localhost:5173', // Replace with your frontend URL
  credentials: true, // If using cookies
}));
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mngo1.mrkjr.mongodb.net/?retryWrites=true&w=majority&appName=mngo1`;

//token verification
 // middlewares 
 const verifyToken = (req, res, next) => {
  
  if (!req.headers.authorization) {
    console.log('No Authorization Header Found');
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  console.log('Token:', token);

  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

  


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("fitnessDB");
    const userCollection = database.collection("users");
    const appliedTrainerCollection=database.collection('trainerApplication');
    const trainerCollection=database.collection('trainers');
    const subscriptionCollection=database.collection('subscription');
    const classCollection=database.collection('class');
    const rejectedTrainerCollection=database.collection('reject');
    const forumCollection=database.collection('forum');
    const slotCollection=database.collection('slot');
    const bookedTrainerCollection=database.collection('bookedTrainer');
    const paymentCollection=database.collection('payment');
    const reviewsCollection=database.collection("review")
    // middlewares
    // use verify admin after verifyToken
  const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await userCollection.findOne(query);
    const isAdmin = user?.role === 'admin';
    if (!isAdmin) {
      return res.status(403).send({ message: 'forbidden access' });
    }
    next();
  }

  // use verify admin after verifyToken
  const verifyTrainer = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await userCollection.findOne(query);
    const isTrainer = user?.role === 'trainer';
    if (!isTrainer) {
      return res.status(403).send({ message: 'forbidden access' });
    }
    next();
  }

//verify member
// use verify admin after verifyToken
const verifyMember = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isMember = user?.role === 'member';
  if (!isMember) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
}  
// 
// ================================================================================= User Data=======
// jwt
app.post("/jwt",async(req,res)=>{
  const user=req.body;
  const token=jwt.sign(user,process.env.TOKEN_SECRET,{expiresIn: '365d'});
  res.send({token});
})
app.post("/users",async(req,res)=>{
    const user=req.body;
    const query={email:user.email};
    //check if user exists already
    const isExists=await userCollection.findOne(query);
    if(isExists){
        return res.send({
            message:"User Already exists",
            insertedId:null
        })
    }
    const result=await userCollection.insertOne(user);
    res.send(result);
});
app.get("/users",async(req,res)=>{
    const result=await userCollection.find().toArray();
    res.send(result)
});
app.get("/users/role/:email",async(req,res)=>{
  const email=req.params.email;
  const result=await userCollection.findOne({email});
  res.send({role:result?.role});
})
//profile
app.get("/profile/:email",verifyToken,verifyMember,async(req,res)=>{
  const email=req.params.email;
  const query={email}
  const result=await userCollection.findOne(query);
  res.send(result)
});

// ============================================================================================================================================Admin========================================================================================
//accept trainer
app.post("/accepttrainer", async (req, res) => {
  const data = req.body; 
  console.log("Received Data:", data);

  if (!data._id) {
    return res.status(400).send({ error: "Invalid ID" });
  }

  try {
    
    const query = { _id: new ObjectId(data._id) };

    // Find the application data from `appliedTrainerCollection`
    const appliedTrainer = await appliedTrainerCollection.findOne(query);

    if (!appliedTrainer) {
      return res.status(404).send({ error: "Trainer application not found" });
    }

    // Modify the data before inserting into `trainerCollection`
    const trainerData = {
      ...appliedTrainer, 
      role: "trainer",   
      status: "accepted" 
    };

    // Insert the modified data into `trainerCollection`
    const insertToTrainer = await trainerCollection.insertOne(trainerData);
    console.log("Insert Result:", insertToTrainer);

    if (!insertToTrainer.insertedId) {
      return res.status(500).send({ error: "Failed to insert trainer" });
    }

    // Update the role of the user in `userCollection` to "trainer"
    const updateUserRole = await userCollection.updateOne(
      { email: appliedTrainer.email }, 
      { $set: { role: "trainer" } }    
    );
    console.log("User Role Update Result:", updateUserRole);

    if (updateUserRole.matchedCount === 0) {
      return res.status(404).send({ error: "User not found to update role" });
    }

    // Remove the application from `appliedTrainerCollection`
    const deleteFromTrainerApplicationCollection = await appliedTrainerCollection.deleteOne(query);
    console.log("Delete Result:", deleteFromTrainerApplicationCollection);

    if (deleteFromTrainerApplicationCollection.deletedCount === 0) {
      return res.status(500).send({ error: "Failed to delete trainer application" });
    }

  

    // Send success response
    res.send(insertToTrainer);

  } catch (error) {
    console.error("Error processing trainer data:", error);
    res.status(500).send({ error: "Internal server error", details: error.message });
  }
});

//reject trainer
app.post("/rejecttrainer",verifyToken,verifyAdmin,async(req,res)=>{
  const data=req.body;
 const result=await rejectedTrainerCollection.insertOne(data);
 const query={email:data.email};
const deleteApplicant=await appliedTrainerCollection.deleteOne(query);
//update status in user collection
const updateUserStatus={
  $set:{status:"rejected"}
}
const updateUserResult=await userCollection.updateOne(query,updateUserStatus);
 res.send(result);
});

//get rejecteed trainer based on id
app.get('/rejectedtrainer/:email',verifyToken,async(req,res)=>{
  const email=req.params.email;
  if (email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' })
  }
  const query={email};
  const result=await rejectedTrainerCollection.findOne(query);
  res.send(result)
})

//all trainer
app.get("/trainers",async(req,res)=>{
  const result=await trainerCollection.find().toArray();
  res.send(result)
})

//single trainer
app.get("/trainer/:id",async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)};
  const result=await trainerCollection.findOne(query);
  res.send(result);
})

app.get("/trainerr/:email", verifyToken,verifyTrainer, async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const result = await trainerCollection.findOne(query);
  if (!result) {
    return res.status(404).send({ message: "Trainer not found" });
  }
  res.send(result);
});


//delete trainer

app.delete('/deletetrainer/:id',verifyToken,verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };

  try {
    // Step 1: Find the trainer by ID
    const trainer = await trainerCollection.findOne(query);
    if (!trainer) {
      return res.status(404).send({ message: "Trainer not found" });
    }

    // Step 2: Delete the trainer
    const deleteResult = await trainerCollection.deleteOne(query);

    //  Update the user's role to 'member' in the user collection
    if (deleteResult.deletedCount > 0) {
      const userEmail = trainer.email; // Extract the trainer's email
      const userQuery = { email: userEmail };
      const updateResult = await userCollection.updateOne(
        userQuery,
        { $set: { role: "member" } }
      );

      // Respond based on the result
      if (updateResult.modifiedCount > 0) {
        return res.send({
          message: "Trainer deleted and user role updated successfully",
          deleteResult,
        });
      } else {
        return res.send({
          message: "Trainer deleted, but user role update failed or was unnecessary",
          deleteResult,
        });
      }
    }

    res.send({ message: "Trainer deletion failed" });
  } catch (err) {
    console.error("Error deleting trainer and updating user role:", err);
    res.status(500).send({ message: "Internal server error", error: err });
  }
});

//newsletter
app.post('/newsletter',async(req,res)=>{
  const data=req.body;
  const result=await subscriptionCollection.insertOne(data);
  res.send(result)
})
app.get('/newsletter',async(req,res)=>{
  const result=await subscriptionCollection.find().toArray();
  res.send(result)
})

//add class
app.post("/addclasses",verifyToken,async(req,res)=>{
  const data=req.body;
  const result=await classCollection.insertOne(data);
  res.send(result);
})

app.get("/class", async (req, res) => {
  const { search = "", page = 1, limit = 6 } = req.query;

  const query = {
    className: { $regex: search, $options: "i" },
  };

  const totalClasses = await classCollection.countDocuments(query);
  const result = await classCollection
    .find(query)
    .skip((page - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .toArray();

  res.send({
    totalClasses,
    classes: result,
  });
});

// latest classes

app.get("/latestclass", async (req, res) => {
  try {
    const result = await classCollection
      .find() 
      .sort({ bookingCount: -1 }) 
      .limit(6) 
      .toArray(); 

    res.send(result);
  } catch (error) {
    console.error("Error fetching latest classes:", error);
    res.status(500).send({ error: "Failed to fetch latest classes" });
  }
});




// ============================================================================================================================================Trainer========================================================================================
app.post("/appliedtrainer",async(req,res)=>{
  const applicationData=req.body;
   //check if trainer exists already in trainerApplication collection
   const isExists=await appliedTrainerCollection.findOne({email:applicationData.email});
   if(isExists){
       return res.send({
           message:"Application already exists",
           insertedId:null
       })
   }

  const result=await appliedTrainerCollection.insertOne(applicationData);
  res.send(result);
})
    
app.get('/appliedtrainer',async(req,res)=>{
const result=await appliedTrainerCollection.find().toArray();
res.send(result)
});


app.get("/appliedtrainerdetails/:id",verifyToken,verifyAdmin,async(req,res)=>{
  const trainerId=req.params.id;
  const query={_id:new ObjectId(trainerId)};
  const result=await appliedTrainerCollection.findOne(query);
  res.send(result);
})


//forum 
app.post("/forum",async(req,res)=>{
  const data=req.body;
  const result=await forumCollection.insertOne(data);
  res.send(result)
})

app.get("/forum", async (req, res) => {
  const { page = 1, limit = 6 } = req.query;

  const totalForums = await forumCollection.countDocuments();
  const forums = await forumCollection
    .find()
    .skip((page - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .toArray();

  res.send({
    totalForums,
    forums,
  });
});

// forum details
app.get('/forumdetails/:id',async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)};
  const result=await forumCollection.findOne(query);
  res.send(result)
})
app.get("/latestforum", async (req, res) => {
  try {
    const result = await forumCollection
      .find() 
      .sort({ _id: -1 }) 
      .limit(6) 
      .toArray(); 

    res.send(result);
  } catch (error) {
    console.error("Error fetching latest classes:", error);
    res.status(500).send({ error: "Failed to fetch latest classes" });
  }
});

// Upvote
app.patch("/upvoat/:id", async (req, res) => {
  const { id } = req.params;
  const result = await forumCollection.updateOne(
    { _id: new ObjectId(id) },
    { $inc: { vote: 1 } }
  );
  res.send(result);
});

// Downvote
app.patch("/downvoat/:id", async (req, res) => {
  const { id } = req.params;
  const result = await forumCollection.updateOne(
    { _id: new ObjectId(id) },
    { $inc: { vote: -1 } }
  );
  res.send(result);
});
//adding slot
app.post('/slots',async(req,res)=>{
  const data=req.body;
  const result=await slotCollection.insertOne(data);
  res.send(result);
})

// delete slot
app.delete("/deleteslot/:id",async(req,res)=>{
  const id=req.params.id;
  const query={_id: new ObjectId(id)};
  const result=await slotCollection.deleteOne(query);
  res.send(result)
})

app.get('/slots/:email',async(req,res)=>{
  const email=req.params.email;
  const query={email}
  const result=await slotCollection.find(query).toArray();
  res.send(result)
})

// book trainer
app.post('/bookedtrainer',verifyToken,async(req,res)=>{
  const data=req.body;
  const result=await bookedTrainerCollection.insertOne(data);
  res.send(result);
})

//booked slot in trainer dashboard rout
app.get('/bookedtrainer/:email',verifyToken,async(req,res)=>{
const email=req.params.email;
const query={trainerEmail:email};
const result=await bookedTrainerCollection.find(query).toArray();
res.send(result);
});

//booked trainer by member
app.get('/memberbookedtrainer/:email',verifyToken,verifyMember,async(req,res)=>{
  const email=req.params.email;
  if (email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' })
  }
  const query={clientEmail:email};
  const result=await bookedTrainerCollection.find(query).toArray();
  res.send(result);
})

// booked slot
app.get('/bookedslot/:email',verifyToken,async(req,res)=>{
  const email=req.params.email;
  const query={trainerEmail:email};
  const result=await bookedTrainerCollection.find(query).toArray();
  res.send(result);
})


// ============================================================================================================================================Trainer========================================================================================

// ============== Stripe payment ===========

app.post("/create-payment-intent", async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  console.log(amount, 'amount inside the intent')

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    payment_method_types: ['card'],
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});


app.post('/payments', async (req, res) => {
  const payment = req.body;

  try {
    // Insert payment into the collection
    const paymentResult = await paymentCollection.insertOne(payment);

    // Update class booking count
    const query = { className: payment.trainerClass };
    const update = {
      $inc: {
        bookingCount: 1,
      },
    };

    const updateClassResult = await classCollection.updateOne(query, update);

    // Send response
    res.send({ paymentResult, updateClassResult });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});

// balance
app.get("/payment",async(req,res)=>{
 const result=await paymentCollection.find().toArray();
 res.send(result);
})

app.get('/latestpayments',async(req,res)=>{
  try {
    const result = await bookedTrainerCollection
      .find() 
      .sort({ _id: -1 }) 
      .limit(6) 
      .toArray(); 

    res.send(result);
  } catch (error) {
    console.error("Error fetching latest classes:", error);
    res.status(500).send({ error: "Failed to fetch latest classes" });
  }
})

// submit review
app.post("/submit-review", async (req, res) => {
  const { trainerId, feedback, rating,userName,userImage } = req.body;

  try {
    const result = await reviewsCollection.insertOne({
      trainerId,
      feedback,
      rating,
      userImage,
      userName,
      createdAt: new Date(),
    });
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to submit review." });
  }
});

app.get('/review',async(req,res)=>{
  const result=await reviewsCollection.find().toArray();
  res.send(result);
})

//fetch trainer by class name
app.get('/classtrainer/:className', async (req, res) => {
  try {
    const className = decodeURIComponent(req.params.className);
    const slots = await slotCollection.find({ className }).toArray();

    if (!slots.length) {
      return res.status(404).json({ message: 'No slots found for this class' });
    }

    const trainerIds = slots.map((slot) => new ObjectId(slot.trainerId));
    const trainers = await trainerCollection.find({ _id: { $in: trainerIds } }).toArray();

    res.status(200).json(trainers);
  } catch (error) {
    console.error('Error fetching trainers:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});























// Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Welcome to fitLogix')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})