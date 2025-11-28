import React from 'react';
import { 
    LayoutTemplate, Columns, SplitSquareHorizontal, Sidebar, 
    Minus, EyeOff, Image as ImageIcon, Link as LinkIcon, Monitor, 
    MousePointerClick, List, MessageSquare, Code, 
    Share2, Download, ShieldCheck, MailMinus, AlertCircle 
} from 'lucide-react';

interface BlockDef {
    name: string;
    icon: React.ReactNode;
    content: string;
}

const BLOCKS: BlockDef[] = [
    {
        name: 'Single Column (100%)',
        icon: <LayoutTemplate size={16} />,
        content: `<!-- Single Column -->
<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding: 20px; background-color: #ffffff;">
      <h2 style="margin: 0 0 10px 0; font-family: sans-serif; color: #333333;">Heading</h2>
      <p style="margin: 0; font-family: sans-serif; color: #666666;">Content goes here.</p>
    </td>
  </tr>
</table>`
    },
    {
        name: '50/50 Split',
        icon: <Columns size={16} />,
        content: `<!-- 2 Column Split -->
<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td width="50%" valign="top" style="padding: 10px;">
      <p style="font-family: sans-serif; margin: 0;">Column 1</p>
    </td>
    <td width="50%" valign="top" style="padding: 10px;">
      <p style="font-family: sans-serif; margin: 0;">Column 2</p>
    </td>
  </tr>
</table>`
    },
    {
        name: '33/33/33 Split',
        icon: <SplitSquareHorizontal size={16} />,
        content: `<!-- 3 Column Split -->
<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td width="33%" valign="top" style="padding: 10px;">
      <p style="font-family: sans-serif; margin: 0;">Col 1</p>
    </td>
    <td width="33%" valign="top" style="padding: 10px;">
      <p style="font-family: sans-serif; margin: 0;">Col 2</p>
    </td>
    <td width="33%" valign="top" style="padding: 10px;">
      <p style="font-family: sans-serif; margin: 0;">Col 3</p>
    </td>
  </tr>
</table>`
    },
    {
        name: 'Sidebar Layout (1/3 + 2/3)',
        icon: <Sidebar size={16} />,
        content: `<!-- Sidebar Layout -->
<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td width="33%" valign="top" style="padding: 10px; background-color: #f9f9f9;">
      <p style="font-family: sans-serif; margin: 0; font-size: 14px;">Sidebar</p>
    </td>
    <td width="67%" valign="top" style="padding: 10px;">
      <p style="font-family: sans-serif; margin: 0;">Main Content</p>
    </td>
  </tr>
</table>`
    },
    {
        name: 'Spacer / Divider',
        icon: <Minus size={16} />,
        content: `<!-- Spacer -->
<div style="height: 20px; line-height: 20px; font-size: 1px;">&nbsp;</div>
<!-- Divider -->
<hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">`
    },
    {
        name: 'Preheader Text (Hidden)',
        icon: <EyeOff size={16} />,
        content: `<!-- Preheader -->
<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
  Insert preheader text here...
</div>`
    },
    {
        name: 'Logo Bar',
        icon: <ImageIcon size={16} />,
        content: `<!-- Logo Bar -->
<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding: 20px 0;">
      <img src="https://placehold.co/150x50.png?text=Logo" alt="Logo" width="150" style="display: block; border: 0;">
    </td>
  </tr>
</table>`
    },
    {
        name: '"View in Browser" Link',
        icon: <LinkIcon size={16} />,
        content: `<!-- View in Browser -->
<div style="text-align: center; padding: 10px 0; font-family: sans-serif; font-size: 12px; color: #999999;">
  <a href="#" style="color: #666666; text-decoration: underline;">View in Browser</a>
</div>`
    },
    {
        name: 'Hero Image',
        icon: <Monitor size={16} />,
        content: `<!-- Hero Image -->
<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center">
      <img src="https://placehold.co/600x300.png" alt="Hero" width="600" style="width: 100%; max-width: 600px; height: auto; display: block;">
    </td>
  </tr>
</table>`
    },
    {
        name: 'Hero with Text Overlay',
        icon: <LayoutTemplate size={16} />,
        content: `<!-- Hero with Text Overlay -->
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-image: url('https://placehold.co/600x300.png'); background-size: cover; background-position: center;">
  <tr>
    <td align="center" height="300" valign="middle" style="padding: 40px;">
      <!--[if mso]>
      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:300px;">
      <v:fill type="tile" src="https://placehold.co/600x300.png" color="#333333" />
      <v:textbox inset="0,0,0,0">
      <![endif]-->
      <h1 style="font-family: sans-serif; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.5); margin: 0;">Impactful Headline</h1>
      <p style="font-family: sans-serif; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">Subtitle goes here</p>
      <!--[if mso]>
      </v:textbox>
      </v:rect>
      <![endif]-->
    </td>
  </tr>
</table>`
    },
    {
        name: 'Z-Pattern (Zig-Zag)',
        icon: <LayoutTemplate size={16} />,
        content: `<!-- Z-Pattern -->
<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <!-- Row 1: Image Left -->
  <tr>
    <td align="center" valign="top" width="50%">
      <img src="https://placehold.co/300x200.png" width="100%" style="display:block;">
    </td>
    <td align="left" valign="middle" width="50%" style="padding: 20px;">
      <h3 style="font-family: sans-serif; margin-top: 0;">Feature One</h3>
      <p style="font-family: sans-serif;">Description text.</p>
    </td>
  </tr>
  <!-- Row 2: Image Right -->
  <tr>
    <td align="left" valign="middle" width="50%" style="padding: 20px;">
      <h3 style="font-family: sans-serif; margin-top: 0;">Feature Two</h3>
      <p style="font-family: sans-serif;">Description text.</p>
    </td>
    <td align="center" valign="top" width="50%">
      <img src="https://placehold.co/300x200.png" width="100%" style="display:block;">
    </td>
  </tr>
</table>`
    },
    {
        name: '"Bulletproof" Button',
        icon: <MousePointerClick size={16} />,
        content: `<!-- Button -->
<table border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
  <tr>
    <td align="center" bgcolor="#0d9488" style="border-radius: 6px;">
      <a href="#" style="display: inline-block; padding: 14px 28px; font-family: sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: bold;">
        Call to Action
      </a>
    </td>
  </tr>
</table>`
    },
    {
        name: 'Icon List',
        icon: <List size={16} />,
        content: `<!-- Icon List -->
<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td width="40" valign="top" style="padding: 10px 0;">
      <img src="https://placehold.co/24x24.png" width="24" height="24" style="display: block;">
    </td>
    <td valign="top" style="padding: 10px;">
      <h4 style="font-family: sans-serif; margin: 0 0 5px;">Benefit One</h4>
      <p style="font-family: sans-serif; margin: 0; font-size: 14px; color: #666;">Explanation.</p>
    </td>
  </tr>
  <tr>
    <td width="40" valign="top" style="padding: 10px 0;">
      <img src="https://placehold.co/24x24.png" width="24" height="24" style="display: block;">
    </td>
    <td valign="top" style="padding: 10px;">
      <h4 style="font-family: sans-serif; margin: 0 0 5px;">Benefit Two</h4>
      <p style="font-family: sans-serif; margin: 0; font-size: 14px; color: #666;">Explanation.</p>
    </td>
  </tr>
</table>`
    },
    {
        name: 'Testimonial Block',
        icon: <MessageSquare size={16} />,
        content: `<!-- Testimonial -->
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f9f9f9" style="border-left: 4px solid #0d9488; margin: 20px 0;">
  <tr>
    <td style="padding: 20px;">
      <p style="font-family: serif; font-style: italic; font-size: 16px; color: #555555; margin: 0 0 10px;">"This service completely changed our workflow for the better. Highly recommended!"</p>
      <p style="font-family: sans-serif; font-weight: bold; font-size: 14px; margin: 0;">- Jane Doe, CEO</p>
    </td>
  </tr>
</table>`
    },
    {
        name: 'Code Snippet / Receipt',
        icon: <Code size={16} />,
        content: `<!-- Code/Receipt -->
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#1e293b" style="border-radius: 8px; overflow: hidden; margin: 20px 0;">
  <tr>
    <td style="padding: 15px;">
      <pre style="font-family: monospace; color: #e2e8f0; font-size: 13px; margin: 0;">Order #12345
Total: $99.00
Status: Paid</pre>
    </td>
  </tr>
</table>`
    },
    {
        name: 'Social Media Icons',
        icon: <Share2 size={16} />,
        content: `<!-- Social Icons -->
<table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 20px auto;">
  <tr>
    <td style="padding: 0 10px;">
      <a href="#"><img src="https://placehold.co/32x32.png?text=FB" width="32" height="32" style="display: block; border: 0;"></a>
    </td>
    <td style="padding: 0 10px;">
      <a href="#"><img src="https://placehold.co/32x32.png?text=TW" width="32" height="32" style="display: block; border: 0;"></a>
    </td>
    <td style="padding: 0 10px;">
      <a href="#"><img src="https://placehold.co/32x32.png?text=IG" width="32" height="32" style="display: block; border: 0;"></a>
    </td>
  </tr>
</table>`
    },
    {
        name: 'App Download Badge',
        icon: <Download size={16} />,
        content: `<!-- App Download -->
<table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding: 20px;">
      <p style="font-family: sans-serif; margin-bottom: 10px;">Download our App</p>
      <a href="#" style="display: inline-block; margin: 0 5px;"><img src="https://placehold.co/120x40.png?text=App+Store" width="120" style="display: block; border: 0;"></a>
      <a href="#" style="display: inline-block; margin: 0 5px;"><img src="https://placehold.co/120x40.png?text=Play+Store" width="120" style="display: block; border: 0;"></a>
    </td>
  </tr>
</table>`
    },
    {
        name: 'Legal Footer',
        icon: <ShieldCheck size={16} />,
        content: `<!-- Footer -->
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #eeeeee; margin-top: 30px;">
  <tr>
    <td align="center" style="padding: 20px; color: #999999; font-family: sans-serif; font-size: 12px;">
      <p style="margin: 0 0 5px;">&copy; 2024 Company Name, Inc.</p>
      <p style="margin: 0;">123 Business Rd, Tech City, TC 90210</p>
    </td>
  </tr>
</table>`
    },
    {
        name: 'Preference Center (Unsub)',
        icon: <MailMinus size={16} />,
        content: `<!-- Unsubscribe -->
<div style="text-align: center; font-family: sans-serif; font-size: 11px; color: #aaaaaa; margin: 20px 0;">
  <a href="#" style="color: #888888; text-decoration: underline;">Update Preferences</a> | 
  <a href="#" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
</div>`
    },
    {
        name: 'Disclaimer Block',
        icon: <AlertCircle size={16} />,
        content: `<!-- Disclaimer -->
<div style="font-family: sans-serif; font-size: 10px; color: #bbbbbb; padding: 10px; text-align: justify;">
  Disclaimer: This message is intended only for the use of the individual or entity to which it is addressed. If you are not the intended recipient, you are hereby notified that any dissemination, distribution or copying of this communication is strictly prohibited.
</div>`
    }
];

export const HtmlBlocksPanel: React.FC = () => {
    const handleDragStart = (e: React.DragEvent, content: string) => {
        e.dataTransfer.setData('text/plain', content);
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden relative">
            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Email Blocks</span>
                <span className="text-teal-600 text-[10px]">Drag to insert</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-20">
                {BLOCKS.map((block, idx) => (
                    <div 
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, block.content)}
                        className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-grab active:cursor-grabbing group flex items-center gap-3"
                    >
                        <div className="text-teal-600 bg-teal-50 p-2 rounded-md group-hover:bg-teal-100 transition-colors">
                            {block.icon}
                        </div>
                        <div className="font-mono text-sm text-slate-700 font-medium">
                            {block.name}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};