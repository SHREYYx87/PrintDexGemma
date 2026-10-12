import fs from 'fs';

const filePath = '/app/applet/src/components/AutoImposer.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace standard setLayoutType inside buttons
content = content.replace(
  'onClick={() => setLayoutType("passport-max")}',
  'onClick={() => handleLayoutTypeChange("passport-max")}'
);
content = content.replace(
  'onClick={() => setLayoutType("custom-grid")}',
  'onClick={() => handleLayoutTypeChange("custom-grid")}'
);
content = content.replace(
  'onClick={() => setLayoutType("original")}',
  'onClick={() => handleLayoutTypeChange("original")}'
);

// Labeled Arrange in Columns -> quantity of image
content = content.replace(
  'Arrange in Columns',
  'quantity of image'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched successfully!");
