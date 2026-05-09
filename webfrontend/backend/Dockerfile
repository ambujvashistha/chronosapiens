# Use Microsoft's official Playwright image which comes with all browsers and dependencies
FROM mcr.microsoft.com/playwright:v1.41.2-focal

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
