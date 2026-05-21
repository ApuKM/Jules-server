const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors")
dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("jules");
    const ideasCollection = db.collection("ideas");

    app.get("/ideas", async (req, res) => {
      const result = await ideasCollection.find().toArray();
      res.send(result);
    });

    app.use("/featured", async(req, res) => {
      const result = await ideasCollection.find().limit(3).toArray();
      res.send(result)
    })

    app.get("/ideas/:ideaId", async(req, res) => {
      const {ideaId} = req.params;
      const result = await ideasCollection.findOne({_id: new ObjectId(ideaId)})
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
