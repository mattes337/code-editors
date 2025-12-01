**Note on compatibility:** These blocks use the standard `table`-based structure (`role="presentation"`) which is required for consistent rendering in Outlook, Gmail, and other major clients. All CSS is inlined.

### I. Structural & Layout Blocks

#### 1\. Single Column (Text)

The fundamental building block.

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td style="padding: 20px; font-family: sans-serif; font-size: 16px; line-height: 24px; color: #333333;">
      <h1 style="margin: 0 0 10px 0;">Hello, World!</h1>
      <p style="margin: 0;">This is a single column of text. It spans the full width of the container.</p>
    </td>
  </tr>
</table>
```

#### 2\. The 50/50 Split (2 Columns)

Uses `align="left"` tables to stack on mobile devices.

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td style="padding: 10px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="48%" align="left" style="min-width: 280px;">
        <tr>
          <td style="padding: 10px; background-color: #f0f0f0;">
             <p style="margin:0;">Left Column Content</p>
          </td>
        </tr>
      </table>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="48%" align="right" style="min-width: 280px;">
        <tr>
          <td style="padding: 10px; background-color: #e0e0e0;">
             <p style="margin:0;">Right Column Content</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

#### 3\. The Sidebar Layout (1/3 + 2/3)

Great for blog thumbnails or product highlights.

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td style="padding: 10px; font-family: sans-serif;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="180" align="left">
        <tr>
          <td valign="top" style="padding-right: 20px;">
            <img src="https://via.placeholder.com/160" alt="Image" width="160" style="display: block; width: 100%; max-width: 160px;">
          </td>
        </tr>
      </table>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 400px;" align="left">
        <tr>
          <td valign="top">
            <h3 style="margin: 0 0 10px 0;">Article Title</h3>
            <p style="margin: 0;">Here is a summary of the article. It sits next to the image on desktop and stacks under it on mobile.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

#### 4\. Spacer / Divider

Essential for adding vertical breathing room.

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td height="30" style="font-size: 0; line-height: 0;">&nbsp;</td>
  </tr>
  <tr>
    <td style="border-top: 1px solid #dddddd; font-size: 0; line-height: 0;">&nbsp;</td>
  </tr>
   <tr>
    <td height="30" style="font-size: 0; line-height: 0;">&nbsp;</td>
  </tr>
</table>
```

### II. Hero & Header Blocks

#### 5\. Preheader (Hidden)

Text that shows in the inbox preview but is invisible in the email body.

```html
<div style="display: none; max-height: 0px; overflow: hidden;">
  Insert your catchy preview text here. This entices the user to open the email...
</div>
<div style="display: none; max-height: 0px; overflow: hidden;">
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>
```

#### 6\. Hero Image

A full-width image.

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center">
      <img src="https://via.placeholder.com/600x300" alt="Banner" width="600" style="display: block; width: 100%; max-width: 100%; height: auto; border: 0;">
    </td>
  </tr>
</table>
```

#### 7\. View in Browser Link

Usually placed at the very top right or centered.

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding: 10px; font-family: sans-serif; font-size: 12px; color: #999999;">
      Having trouble viewing this email? <a href="#" style="color: #999999; text-decoration: underline;">View it in your browser</a>.
    </td>
  </tr>
</table>
```

### III. Content Blocks

#### 8\. The "Bulletproof" Button

This version works even if images are blocked.

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding: 20px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" bgcolor="#007bff" style="border-radius: 4px;">
            <a href="https://example.com" target="_blank" style="padding: 15px 25px; border: 1px solid #007bff; border-radius: 4px; font-family: sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; display: inline-block; font-weight: bold;">
              Call to Action
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

#### 9\. Icon List

Great for features or checklists.

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td width="40" valign="top" style="padding: 10px 0;">
      <img src="https://via.placeholder.com/24" alt="Check" width="24" style="display: block;">
    </td>
    <td valign="top" style="padding: 10px; font-family: sans-serif; font-size: 14px; color: #333333;">
      <strong>Feature One:</strong> Description of the feature goes here. It helps explain the value.
    </td>
  </tr>
    <tr>
    <td width="40" valign="top" style="padding: 10px 0;">
      <img src="https://via.placeholder.com/24" alt="Check" width="24" style="display: block;">
    </td>
    <td valign="top" style="padding: 10px; font-family: sans-serif; font-size: 14px; color: #333333;">
      <strong>Feature Two:</strong> Description of the second feature goes here.
    </td>
  </tr>
</table>
```

#### 10\. Video Thumbnail (Fake Player)

Since video doesn't play in most emails, use an image with a "Play" button overlay.

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding: 20px;">
      <a href="https://youtube.com/watch?v=xyz" target="_blank">
        <img src="https://via.placeholder.com/600x338?text=Play+Video" alt="Watch Video" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;">
      </a>
    </td>
  </tr>
</table>
```

### IV. Footer & Compliance Blocks

#### 11\. Social Media Row

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding: 20px;">
      <a href="#" style="text-decoration: none; margin: 0 10px;">
        <img src="https://via.placeholder.com/32?text=FB" alt="Facebook" width="32" style="display: inline-block; border: 0;">
      </a>
      <a href="#" style="text-decoration: none; margin: 0 10px;">
        <img src="https://via.placeholder.com/32?text=TW" alt="Twitter" width="32" style="display: inline-block; border: 0;">
      </a>
      <a href="#" style="text-decoration: none; margin: 0 10px;">
        <img src="https://via.placeholder.com/32?text=IG" alt="Instagram" width="32" style="display: inline-block; border: 0;">
      </a>
    </td>
  </tr>
</table>
```

#### 12\. Standard Legal Footer

Includes unsubscribe and physical address.

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding: 20px; background-color: #eeeeee; font-family: sans-serif; font-size: 12px; color: #666666;">
      <p style="margin: 0 0 10px 0;">&copy; 2024 Your Company Name. All rights reserved.</p>
      <p style="margin: 0 0 10px 0;">123 Business Rd, Tech City, TC 90210</p>
      <p style="margin: 0;">
        <a href="#" style="color: #666666; text-decoration: underline;">Unsubscribe</a> | 
        <a href="#" style="color: #666666; text-decoration: underline;">Manage Preferences</a>
      </p>
    </td>
  </tr>
</table>
```