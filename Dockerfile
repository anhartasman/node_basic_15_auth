# Use Node LTS (works well with older dependencies)
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy only package files first
COPY package*.json ./

# Install dependencies (including nodemon if needed)
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the port your app listens on (likely 3000)
EXPOSE 3000

# Run the app (NOT nodemon)
CMD ["npm", "run", "start-server"]
