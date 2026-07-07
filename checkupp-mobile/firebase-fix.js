// with-firebase-fix.js
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withFirebasePodsFix(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfile = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let contents = fs.readFileSync(podfile, "utf-8");

      // Add :modular_headers => true to any RNFB* pod line
      contents = contents.replace(/pod 'RNFB[^']*'.*$/gm, (match) => {
        if (match.includes(":modular_headers")) {
          return match; // already patched
        }
        return match.replace(
          /(pod 'RNFB[^']*'.*?)$/,
          "$1, :modular_headers => true"
        );
      });

      fs.writeFileSync(podfile, contents);
      return config;
    },
  ]);
}

module.exports = withFirebasePodsFix;
