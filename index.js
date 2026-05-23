const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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

const verifyToken = async (req, res, next) => {
  const { authorization } = req.headers;
  // console.log(req.headers, 'from verify token');
  const token = authorization?.split(" ")[1];
  // console.log(token);

  if (!token) {
    return res.status(401).json({ message: "Unauthorize" });
  }

  try {
    const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
    );
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;

    next();
  } catch (error) {
    console.error("Token validation failed:", error);
    return res.status(401).json({ message: "Unauthorize" });
  }
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("jules");
    const ideasCollection = db.collection("ideas");
    const commentsCollection = db.collection("comments");

    app.get("/ideas", async (req, res) => {
      const { query } = req.query;
      let cursor;
      if (query) {
        cursor = ideasCollection.find({
          $or: [
            {
              ideaTitle: {
                $regex: query,
                $options: "i",
              },
            },
            {
              category: {
                $regex: query,
                $options: "i",
              },
            },
          ],
        });
      } else {
        cursor = ideasCollection.find();
      }
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/ideas/user/:email", verifyToken, async (req, res) => {
      const { email } = req.params;
      // console.log(email)
      const result = await ideasCollection.find({ userEmail: email }).toArray();
      res.send(result);
    });

    app.get("/featured", async (req, res) => {
      const result = await ideasCollection.find().limit(3).toArray();
      res.send(result);
    });

    app.get("/ideas/:ideaId", verifyToken, async (req, res) => {
      const { ideaId } = req.params;
      // console.log(ideaId)
      const result = await ideasCollection.findOne({
        _id: new ObjectId(ideaId),
      });
      res.send(result);
    });

    app.get("/comments/:ideaId", verifyToken, async (req, res) => {
      const { ideaId } = req.params;
      // console.log(ideaId);
      const result = await commentsCollection.find({ ideaId }).toArray();
      res.send(result);
    });

    app.post("/add-idea", verifyToken, async (req, res) => {
      const data = req.body;
      const result = await ideasCollection.insertOne({
        ...data,
        createdAt: new Date(),
      });
      res.send(result);
    });

    app.post("/add-comment", async (req, res) => {
      const data = req.body;
      // console.log(data)
      const result = await commentsCollection.insertOne({
        ...data,
        createdAt: new Date(),
      });
      res.send(result);
    });

    app.patch("/comments/edit/:commentId", async (req, res) => {
      const { commentId } = req.params;
      // console.log(commentId)
      const {editComment} = req.body;
      console.log(editComment)
      const result = await commentsCollection.updateOne(
        {
          _id: new ObjectId(commentId),
        },
        {
          $set: { comment: editComment, updatedAt: new Date() },
        },
      );
      res.send(result);
    });

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
