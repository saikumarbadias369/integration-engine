# This line: Start FROM an existing Node.js 18 image
# alpine means lightweight version (smaller = faster)
# Think of this as: "Start with a fresh computer that already has Node.js installed"
FROM node:18-alpine

# This line: Set the working folder INSIDE the container
# Like cd /app inside the container
# All next commands run from /app
WORKDIR /app

# This line: Copy package.json from YOUR computer INTO the container's /app folder
# The dot at end means "copy to current directory" (which is /app)
COPY package*.json ./

# This line: Run npm install INSIDE the container
# Installs all your Node.js packages
RUN npm install --omit=dev

# This line: Copy ALL your source code into the container
# First dot = everything on your computer
# Second dot = paste it in /app (current WORKDIR)
COPY . .

# This line: Just documentation — says "this app uses port 5004"
# Does NOT actually open the port (docker-compose does that)
EXPOSE 5004

# This line: The command that runs when container STARTS
# This is what starts your server
CMD ["node", "server.js"]