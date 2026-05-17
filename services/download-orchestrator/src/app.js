const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const downloadRoutes = require("./routes/downloadRoutes");
const healthRoutes = require("./routes/healthRoutes");
const swaggerSpec = require("./docs/swagger");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", healthRoutes);
app.use("/downloads", downloadRoutes);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = app;
