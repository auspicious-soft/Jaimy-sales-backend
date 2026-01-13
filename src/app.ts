import express from "express"
import cors from "cors"
// import cookieParser from "cookie-parser";
import path from "path"
import { fileURLToPath } from 'url'
import connectDB from "./config/db"
// import admin from "firebase-admin"
import bodyParser from 'body-parser'
import { whatsappRoutes } from "./routes"

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url) // <-- Define __filename
const __dirname = path.dirname(__filename)        // <-- Define __dirname
// const serviceAccount = require(path.join(__dirname, 'config/firebase-adminsdk.json'));

const PORT = process.env.PORT || 8080
const app = express()

app.use(express.json());
app.set("trust proxy", true)
app.use(bodyParser.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
// app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

app.use(
    cors({
        origin: "*",
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
        credentials: true,
    })
);


var dir = path.join(__dirname, 'static')
app.use(express.static(dir))

var uploadsDir = path.join(__dirname, 'uploads')
app.use('/uploads', express.static(uploadsDir))


connectDB();


app.get("/", (_, res: any) => {
  res.send("Hello world entry point 🚀✅");
});

app.use('/api/whatsapp', whatsappRoutes);

// initializeFirebase()
app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
