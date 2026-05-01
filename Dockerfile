FROM nginx:alpine

# Copy the built script into nginx static content
COPY map/dist/tw-marker.legal.js /usr/share/nginx/html/tw-marker.legal.js

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
