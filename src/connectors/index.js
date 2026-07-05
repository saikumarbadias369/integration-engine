const hubspotConnector = require("./hubspot.connector")

const registry = {
  hubspot: hubspotConnector
}

exports.getConnector = (eventType) => {
  const prefix = eventType.split(".")[0]
  return registry[prefix]
}