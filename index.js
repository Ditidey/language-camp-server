const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

app.use(express.json());
app.use(cors())

app.get('/', (req, res) =>{
    res.send('global talk is talking')
})
app.listen(port, () =>{
    console.log(`global talk running on ${port}`)
})