# Use a lightweight web server image
FROM nginx:alpine

# Copy your static HTML file into the container
COPY . /usr/share/nginx/html

# Expose port 80 (the default HTTP port)
EXPOSE 4000
