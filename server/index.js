const express = require('express');
const bp = require('body-parser');
const cors = require('cors');
const keys = require('./keys');

const app = express();
app.use(cors());
app.use(bp.json());

// postgre setup
const {Pool} = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});

app.listen(5000, err => {
    console.log('Hello from Express Server');
})

pgClient.on('error',() => {
    console.log('Connection lost to Pstgre');
});

pgClient.query("CREATE TABLE IF NOT EXISTS values (number int)").catch(err => console.log(err));

const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();

app.get('./',(req, res) => {
    res.send('Hi');
})

app.get('/values/all',async(req,res) => {
    const values = await pgClient.query('Select * from values');
    res.send(values.rows);
});

app.get('/values/current',async(req,res) => {
    redisClient.hgetall('values',(err,values)=>{
        res.send(values);
    });
});

app.post('/values',async(req,res) => {
    const index = req.body.index;
    if(parseInt(index) > 40) 
        return res.status(422).send('Index too high');

    redisClient.hset('values',index,"Nothing yet");
    redisPublisher.publish('insert',index);
});
