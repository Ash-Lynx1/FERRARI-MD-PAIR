const mega = require("megajs");

const auth = {
  email: 'jadenafrix10@gmail.com', //use your real vaild mega account email
  password: 'Mahachi2007.', ////use your real vaild mega account password
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
};

const upload = (data, name) => {
  return new Promise((resolve, reject) => {
    try {
      if (!auth.email || !auth.password || !auth.userAgent) {
        throw new Error("Missing required authentication fields");
      }
      
      console.log("Using auth:", auth); // Debugging line
      
      // Modify the filename to start with FERRARI-MD-V1_
      const modifiedName = `FERRARI-MD-V1_${name}`;

      const storage = new mega.Storage(auth, () => {
        data.pipe(storage.upload({ name: modifiedName, allowUploadBuffering: true }));
        storage.on("add", (file) => {
          file.link((err, url) => {
            if (err) {
              reject(err);
              return;
            }
            storage.close();
            resolve(url); // Still returns only the URL, unchanged
          });
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { upload };
