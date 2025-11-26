const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;



// middleware
app.use(cors({ origin: "https://admin-subrota.vercel.app", credentials: true, allowedHeaders: ["Content-Type", "Authorization"], }));
app.use(express.json());
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wybojxh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(403).json({ message: "No token provided" });

    const token = header.split(" ")[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        req.user = decoded;
        next();
    });
}

app.use((req, res, next) => {
    console.log("AUTH HEADER =>", req.headers.authorization);
    next();
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (email !== ADMIN_EMAIL) {
        return res.status(401).json({ message: "Invalid email" });
    }

    const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD);
    if (!isMatch) {
        return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "2h" });
    res.json({ token });
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const db = client.db("myPortfolio");
        const projectCollection = db.collection("projects");

        // GET all projects
        app.get("/projects", async (req, res) => {
            const projects = await projectCollection.find().toArray();
            res.send(projects);
        });
        app.get("/projectsHome", async (req, res) => {
            const projects = await projectCollection.find().sort({ _id: -1 }).limit(3).toArray();
            res.send(projects);
        });
        // GET Signle projects
        app.get("/projects/:id", async (req, res) => {
            const id = req.params.id;

            try {
                const query = { _id: new ObjectId(id) };
                const project = await projectCollection.findOne(query);

                if (!project) {
                    return res.status(404).send({ message: "Project not found" });
                }

                res.send(project);
            } catch (error) {
                res.status(500).send({ message: "Error fetching project", error: error.message });
            }
        });
        app.post("/projects", auth, async (req, res) => {
            const newProject = req.body;
            const result = await projectCollection.insertOne(newProject);
            res.send(result);
        });
        app.delete("/projects/:id", auth, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await projectCollection.deleteOne(query);
            res.send(result);
        });

        app.put("/projects/:id", auth, async (req, res) => {
            try {
                const id = req.params.id;
                const updatedProject = req.body;
                const filter = { _id: new ObjectId(id) };

                const updateDoc = {
                    $set: {
                        name: updatedProject.name,
                        image: updatedProject.image,
                        description: updatedProject.description,
                        stack: updatedProject.stack,
                        liveLink: updatedProject.liveLink,
                        githubLink: updatedProject.githubLink,
                        challenges: updatedProject.challenges,
                        futurePlans: updatedProject.futurePlans,
                        status: updatedProject.status,
                    },
                };

                const result = await projectCollection.updateOne(filter, updateDoc);
                res.send(result);
            } catch (error) {
                console.error("Error updating project:", error);
                res.status(500).send({ error: "Failed to update project" });
            }
        });

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// root route
app.get("/", (req, res) => {
    res.send("Portfolio server is running");
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});