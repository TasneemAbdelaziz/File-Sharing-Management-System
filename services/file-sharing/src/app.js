const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const shareRoutes = require("./routes/shareRoutes");
const healthRoutes = require("./routes/healthRoutes");
const swaggerSpec = require("./docs/swagger");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", healthRoutes);
app.use("/shares", shareRoutes);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = app;
