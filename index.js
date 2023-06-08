const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(express.json());
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kos6m2u.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
     
    // await client.connect();
    const classCollections = client.db('global-language').collection('classes')
    const studentCollections = client.db('global-language').collection('students');

    app.put('/students/:email', async(req,res)=>{
        const email = req.params.email;
        const info = req.body;
        const query = {email: email};
        const options = {upsert: true};
        const updateInfo = {
            $set:  info
        }
        const result = await studentCollections.updateOne(query,updateInfo,options)
        res.send(result)
        
    })
    app.get('/students', async(req, res)=>{
        const result = await studentCollections.find().toArray();
        res.send(result)
    })
    app.get('/students/:email', async(req, res)=>{
        const email = req.params.email;
        // console.log(email)
        const query = {email: email};
        const result = await studentCollections.findOne(query);
        res.send(result);
    })

    app.post('/add-classes', async (req, res)=>{
        const eachClass = req.body;
        const result = await classCollections.insertOne(eachClass)
        res.send(result);
    })
    app.get('/classes', async(req, res)=>{
        const result = await classCollections.find().toArray();
        res.send(result)
    })
    app.patch('/classes/:id', async(req,res)=>{
        const id = req.params.id;
        const infoRole = req.body;
        // console.log(infoRole)
        const query = {_id: new ObjectId(id)};
        const updateClass = {
            $set: {status: infoRole.status}
        }
        const result = await classCollections.updateOne(query, updateClass);
        res.send(result)
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) =>{
    res.send('global talk is talking')
})
app.listen(port, () =>{
    console.log(`global talk running on ${port}`)
})