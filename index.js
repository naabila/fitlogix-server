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
})
app.get("/users",async(req,res)=>{
    const result=await userCollection.find().toArray();
    res.send(result)
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