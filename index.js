const { init } = require("./dist/index");

init()
  .then(server => global.server = server)
  .catch(err => console.error(err))
