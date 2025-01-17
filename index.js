const express = require('express')
const app = express()
const port = process.env.PORT||3000;
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mngo1.mrkjr.mongodb.net/?retryWrites=true&w=majority&appName=mngo1`;

//token verification
 // middlewares 
 const verifyToken = (req, res, next) => {
  
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

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


// ================================================================================= User Data=======
// jwt
app.post("/jwt",async(req,res)=>{
  const user=req.body;
  const token=jwt.sign(user,process.env.TOKEN_SECRET,{expiresIn:"24h"});
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