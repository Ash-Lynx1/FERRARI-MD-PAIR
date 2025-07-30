const mega = require("megajs");

const auth = {
  email: 'jadenafrix10@gmail.com', // Use your real valid mega account email
  password: 'Mahachi2007.',       // Use your real valid mega account password
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
};

// Function to generate custom session ID
const generateSessionId = () => {
  const timestamp = Date.now().toString(36); // Shortened timestamp
  const random = Math.random().toString(36).substr(2, 5); // Random string
  return `FERRARI-MD-V1_${timestamp}${random}`.toUpperCase();
};

const upload = (data, name) => {
  return new Promise((resolve, reject) => {
    try {
      if (!auth.email || !auth.password) {
        throw new Error("Missing required authentication fields");
      }

      console.log("Using auth:", auth);

      const storage = new mega.Storage(auth, () => {
        // Generate session ID before upload
        const sessionId = generateSessionId();

        const uploadStream = data.pipe(storage.upload({ name: name, allowUploadBuffering: true }));

        storage.on("add", (file) => {
          file.link((err, url) => {
            if (err) {
              reject(err);
              return;
            }
            storage.close();

            // Resolve with both the session ID and the download URL
            resolve({
              sessionId: sessionId,
              downloadUrl: url
            });
          });
        });

        // Optional: Handle upload errors
        uploadStream.on("error", (err) => {
          reject(new Error("Upload failed: " + err.message));
        });
      });

      // Handle storage connection errors
      storage.on("error", (err) => {
        reject(new Error("Storage connection error: " + err.message));
      });

    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { upload, generateSessionId };
