const app = require("./app");
require("dotenv").config();

const PORT = process.env.PORT || 2053;

app.listen(PORT, () => {
  console.log(`Serveur BlockLucky démarré sur le port http://localhost:${PORT}/health`);
});
