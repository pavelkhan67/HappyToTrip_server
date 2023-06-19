const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hgvq2ef.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect(err => {
            if (err) {
                console.error(err);
                return;
            }
        });

        const usersCollection = client.db("happyTrip").collection("users");
        const placesCollection = client.db("happyTrip").collection("places");
        const hotelsCollection = client.db("happyTrip").collection("hotels");
        const selectCollection = client.db("happyTrip").collection("selected");
        const bookingCollection = client.db("happyTrip").collection("booking");
        const paymentCollection = client.db("happyTrip").collection("payment");

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })


        // user related api
        app.get('/users', verifyJWT, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            // console.log(existingUser);
            if (existingUser) {
                return res.send({ message: 'User Already Exists!' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.delete('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        // Places related apis
        app.get('/place', async (req, res) => {
            const result = await placesCollection.find().toArray();
            res.send(result);
        })

        app.get('/place/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await placesCollection.findOne(query);
            res.send(result);
        })

        // Selected Place api
        app.get('/selected', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            const query = { email: email };
            const result = await selectCollection.find(query).toArray();
            // console.log(result);
            res.send(result);
        });

        app.post('/selected', async (req, res) => {
            const item = req.body;
            // console.log(item);
            const result = await selectCollection.insertOne(item);
            res.send(result);
        })

        app.delete('/selected/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectCollection.deleteOne(query);
            res.send(result);
        })


        // Hotels related apis
        app.get('/hotel', async (req, res) => {
            const query = { status: 'approved' }
            const result = await hotelsCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/hotel/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await hotelsCollection.findOne(query);
            res.send(result);
        })

        app.get("/search/:text", async (req, res) => {
            const text = req.params.text;
            const regex = new RegExp(text, "i");
            const result = await hotelsCollection
                .find({
                    status: "approved",
                    $or: [
                        { name: { $regex: regex } },
                        { location: { $regex: regex } }
                    ]
                })
                .toArray();
            res.send(result);
        });

        // Selected Hotel api
        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            const query = { email: email };
            const result = await bookingCollection.find(query).toArray();
            // console.log(result);
            res.send(result);
        });

        app.post('/bookings', async (req, res) => {
            const item = req.body;
            // console.log(item);
            const result = await bookingCollection.insertOne(item);
            res.send(result);
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updateResult = await hotelsCollection.updateOne(query, { $inc: { booked: 1, availableRoom: -1 } });
            res.send(updateResult);
        });

        // Instructor added class
        app.get('/addedhotel', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await hotelsCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/addedhotell', async (req, res) => {
            const query = { $or: [{ status: 'pending' }, { status: 'approved' }, { status: 'denied' }] };
            const result = await hotelsCollection.find(query).sort({ "status": -1 }).toArray();
            res.send(result);
        })

        app.patch('/addedhotell/approve/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'approved'
                },
            };
            const result = await hotelsCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.patch('/addedhotell/deny/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'denied'
                },
            };
            const result = await hotelsCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.post('/addedhotel', verifyJWT, async (req, res) => {
            const newItem = req.body;
            const result = await hotelsCollection.insertOne(newItem)
            res.send(result);
        })

        app.delete('/addedhotel/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await hotelsCollection.deleteOne(query);
            res.send(result);
        })

        // create payment intent
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // payment related api
        app.get('/payment', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }
            const query = { email: email };
            const result = await paymentCollection.find(query).sort({ "date": -1 }).toArray();
            res.send(result);
        })

        app.post('/payment', verifyJWT, async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);
            res.send({ insertResult });
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
    res.send('Trip is going on')
})

app.listen(port, () => {
    console.log(`Trip is going on port ${port}`);
})