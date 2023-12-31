const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.PAYMENT_KEY);
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
 
  
app.use(express.json());
app.use(cors())

const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized' })
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized' })
    }
    req.decoded = decoded;
    next();
  })
}

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
    const selectedClassCollections = client.db('global-language').collection('selected-classes');
    const  paymentCollections = client.db('global-language').collection('paid-classes');
    
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await studentCollections.findOne(query);
      if (user?.status !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await studentCollections.findOne(query);
      if (user?.status !== 'instructor') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    app.post('/selected-classes', async (req, res) => {
      const oneClass = req.body;
      const result = await selectedClassCollections.insertOne(oneClass);
      res.send(result);
    })
    app.put('/selected-classes/:id', async (req, res) => {
      const id = req.params.id;
      const classInfo = req.body;
      // console.log('info', classInfo)
      const query = { class_id: id };
      const options = { upsert: true };
      const updateInfo = {
        $set: classInfo
      }
      const result = await selectedClassCollections.updateOne(query, updateInfo, options)
      res.send(result)
    })
    app.get('/selected-classes', async (req, res) => {
      let query = {};
      if (req?.query.email) {
        query = { student_email: req.query.email }
      }

      const result = await selectedClassCollections.find(query).toArray();
      // console.log('sort', result)
      res.send(result)
    })
    app.delete('/selected-classes/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollections.deleteOne(query);
      res.send(result);
    })

    app.put('/students/:email', async (req, res) => {
      const email = req.params.email;
      const info = req.body;
      const query = { email: email };
      const options = { upsert: true };
      const updateInfo = {
        $set: info
      }
      const result = await studentCollections.updateOne(query, updateInfo, options)
      res.send(result)

    })
    app.get('/students', async (req, res) => {
      const result = await studentCollections.find().toArray();
      res.send(result)
    })
    app.get('/students/:email', async (req, res) => {
      const email = req.params.email;
      // console.log(email)
      const query = { email: email };
      const result = await studentCollections.findOne(query);
      res.send(result);
    })

    app.post('/add-classes', async (req, res) => {
      const eachClass = req.body;
      const result = await classCollections.insertOne(eachClass)
      res.send(result);
    })
    app.get('/classes', async (req, res) => {
      const query = {};
      // if (req.query?.email) {
      //   query = { email: req.query.email }
      // }
      // console.log(req.query?.students)

      const sortValue = {};
      const students = req.query?.students;
      sortValue[students] = -1;
      // const sortField = req.query?.students;
      // const sortValue = -1;
      const result = await classCollections.find(query).sort(sortValue).toArray();

      res.send(result)
    })

    app.patch('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const infoRole = req.body;
      // console.log(infoRole)
      const query = { _id: new ObjectId(id) };
      const updateClass = {
        $set: { status: infoRole.status }
      }
      const result = await classCollections.updateOne(query, updateClass);
      res.send(result)
    })
    app.put('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const infoRole = req.body;
       
      const query = { _id: new ObjectId(id) };
      const updateClass = {
        $set: infoRole
        // $set: { students: infoRole.students }
      }
      const options = { upsert: true };
      const result = await classCollections.updateOne(query, updateClass, options);
      res.send(result)
    })
     
    // payment method
    app.post('/create-payment', async(req, res)=>{
      const {price} = req.body;
      const amount =  price*100;
      // console.log('price', price, typeof amount)
       if(amount > 0){
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card']
        })
  
        res.send({
          clientSecret: paymentIntent.client_secret
        })
       }
    })
// for payment post
    app.post('/payment', async(req, res)=>{
      const payDetails = req.body;
      const result = await paymentCollections.insertOne(payDetails);

      const query = {class_id: payDetails.class_id}
      // console.log(query)
      const deletedResult = await selectedClassCollections.deleteOne(query);
      
      const updateQuery = {_id: new ObjectId(payDetails.class_id)};
      const updatedResult = await classCollections.updateOne(updateQuery, {$inc: {students: 1, seat: -1}})
      res.send({result, deletedResult, updatedResult});
    })

    app.get('/get-payment', async(req, res)=>{
      const email = req.query?.email;
      // console.log(email)
      const query = {student_email: email}
      const result = await paymentCollections.find(query).toArray();
      res.send(result);
    })



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('global talk is talking')
})
app.listen(port, () => {
  console.log(`global talk running on ${port}`)
})