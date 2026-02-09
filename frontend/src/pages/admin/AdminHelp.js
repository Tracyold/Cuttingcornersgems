import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, CreditCard, Cloud, Shield, Mail } from 'lucide-react';

const helpContent = {
  stripe: {
    title: 'Setting Up Stripe Payments',
    icon: CreditCard,
    sections: [
      {
        title: '1. Create a Stripe Account',
        content: `
          1. Go to [stripe.com](https://stripe.com) and click "Start now"
          2. Enter your email and create a password
          3. Verify your email address
          4. Complete your business profile (you can use test mode initially)
        `
      },
      {
        title: '2. Get Your API Keys',
        content: `
          1. Log into your Stripe Dashboard
          2. Click "Developers" in the left sidebar
          3. Click "API keys"
          4. You'll see two keys:
             - **Publishable key** (starts with pk_test_ or pk_live_)
             - **Secret key** (starts with sk_test_ or sk_live_)
          5. Copy both keys to your admin settings
        `
      },
      {
        title: '3. Test Mode vs Live Mode',
        content: `
          **Test Mode** (recommended to start):
          - Use test API keys (pk_test_ and sk_test_)
          - No real money is charged
          - Use test card: 4242 4242 4242 4242, any future date, any CVC
          
          **Live Mode** (for real payments):
          - Complete Stripe account verification
          - Use live API keys (pk_live_ and sk_live_)
          - Real credit cards will be charged
        `
      },
      {
        title: '4. Set Up Webhooks (Optional but Recommended)',
        content: `
          Webhooks allow Stripe to notify your site about events:
          
          1. In Stripe Dashboard, go to Developers → Webhooks
          2. Click "Add endpoint"
          3. Enter your webhook URL: \`https://yoursite.com/api/stripe/webhook\`
          4. Select events: payment_intent.succeeded, checkout.session.completed
          5. Copy the "Signing secret" to your admin settings
        `
      }
    ],
    links: [
      { label: 'Stripe Dashboard', url: 'https://dashboard.stripe.com' },
      { label: 'Stripe Documentation', url: 'https://stripe.com/docs' },
      { label: 'Test Card Numbers', url: 'https://stripe.com/docs/testing#cards' }
    ]
  },
  storage: {
    title: 'Setting Up Cloud Storage',
    icon: Cloud,
    sections: [
      {
        title: 'Option 1: Cloudinary (Easiest)',
        content: `
          1. Go to [cloudinary.com](https://cloudinary.com) and sign up free
          2. From your Dashboard, find:
             - **Cloud Name** (your account name)
             - **API Key**
             - **API Secret**
          3. Enter these in your admin settings
          
          Cloudinary offers 25GB free storage and automatic image optimization.
        `
      },
      {
        title: 'Option 2: AWS S3',
        content: `
          1. Create an AWS account at [aws.amazon.com](https://aws.amazon.com)
          2. Go to S3 and create a bucket
          3. Go to IAM and create a user with S3 access
          4. Get your Access Key ID and Secret Access Key
          5. Set bucket permissions for public read access
        `
      },
      {
        title: 'Option 3: Direct URLs',
        content: `
          You can skip cloud storage setup and use direct URLs:
          
          1. Upload images to any hosting service
          2. Copy the direct image URL
          3. Paste URLs when adding products/gallery items
          
          Popular free options:
          - Imgur (imgur.com)
          - ImgBB (imgbb.com)
          - Google Drive (with public sharing)
        `
      }
    ],
    links: [
      { label: 'Cloudinary', url: 'https://cloudinary.com' },
      { label: 'AWS S3', url: 'https://aws.amazon.com/s3/' },
      { label: 'ImgBB (Free)', url: 'https://imgbb.com' }
    ]
  },
  security: {
    title: 'Setting Up Security Features',
    icon: Shield,
    sections: [
      {
        title: 'SMS Verification with Twilio',
        content: `
          1. Create account at [twilio.com](https://twilio.com)
          2. Get your Account SID and Auth Token from the Console
          3. Buy a phone number (or use free trial number)
          4. Enter credentials in admin settings
          
          Cost: ~$0.0075 per SMS (first $15 free on trial)
        `
      },
      {
        title: 'Google reCAPTCHA Setup',
        content: `
          1. Go to [google.com/recaptcha](https://www.google.com/recaptcha/admin)
          2. Click "+ Create" to register a new site
          3. Choose reCAPTCHA v2 "I'm not a robot" checkbox
          4. Add your domain(s)
          5. Copy the Site Key and Secret Key
          6. Enter in admin settings
        `
      },
      {
        title: 'hCaptcha Setup (Privacy-Focused Alternative)',
        content: `
          1. Go to [hcaptcha.com](https://www.hcaptcha.com)
          2. Sign up for a free account
          3. Create a new site
          4. Copy your Site Key and Secret Key
          5. Enter in admin settings
          
          hCaptcha is free and more privacy-focused than reCAPTCHA.
        `
      }
    ],
    links: [
      { label: 'Twilio', url: 'https://twilio.com' },
      { label: 'Google reCAPTCHA', url: 'https://www.google.com/recaptcha' },
      { label: 'hCaptcha', url: 'https://www.hcaptcha.com' }
    ]
  },
  email: {
    title: 'Setting Up Email Notifications',
    icon: Mail,
    sections: [
      {
        title: 'Option 1: SendGrid (Recommended)',
        content: `
          1. Sign up at [sendgrid.com](https://sendgrid.com)
          2. Complete sender verification (verify your email/domain)
          3. Go to Settings → API Keys → Create API Key
          4. Copy the API key (starts with SG.)
          5. Enter in admin settings
          
          Free tier: 100 emails/day
        `
      },
      {
        title: 'Option 2: Resend (Simple & Modern)',
        content: `
          1. Sign up at [resend.com](https://resend.com)
          2. Add and verify your domain
          3. Create an API key
          4. Copy the key to admin settings
          
          Free tier: 3,000 emails/month
        `
      }
    ],
    links: [
      { label: 'SendGrid', url: 'https://sendgrid.com' },
      { label: 'Resend', url: 'https://resend.com' },
      { label: 'Mailgun', url: 'https://mailgun.com' }
    ]
  },
  'system-tools': {
    title: 'System Tools Guide',
    icon: Shield,
    sections: [
      {
        title: 'What System Tools Are',
        content: `
          System Tools are admin-only operational utilities for database maintenance, integrity checking, and system diagnostics.
          
          **Tool Categories**:
          - **READ-ONLY**: Generate reports without changing data
          - **STRUCTURAL**: Modify database structure (indexes) without changing records
          - **DATA-MODIFYING**: Clean or repair data records
          
          These tools are designed for:
          - Routine maintenance
          - Troubleshooting data issues
          - Performance optimization
          - System health monitoring
        `
      },
      {
        title: 'How to Use System Tools',
        content: `
          **Step-by-step process**:
          
          1. **Open System Tools tab** in admin navigation
          2. **Re-enter admin password** to unlock (valid for 10 minutes)
          3. **Select a tool** from the list
          4. **Click "Run"** button
          5. **Read the warning modal** carefully
          6. **Click "I Understand — Run Now"** to proceed (or Cancel)
          7. **Wait for completion** (some tools may take 10-30 seconds)
          8. **Download output** as TXT or JSON for record-keeping
          
          **Re-authentication requirement**: Tools auto-lock after 10 minutes for safety.
        `
      },
      {
        title: 'What NOT to Do',
        content: `
          ⚠️  **Critical warnings**:
          
          1. **DO NOT** run DATA-MODIFYING tools unless you understand the warning
          2. **DO NOT** enable repair flags (if mentioned in outputs) without database backups
          3. **DO NOT** repeatedly run "Ensure Indexes" during peak traffic hours
          4. **DO NOT** treat TTL as reversible — TTL deletes are automatic once enabled
          5. **DO NOT** run repair operations without reviewing integrity/cleanliness reports first
          6. **DO NOT** interrupt a running tool (wait for completion)
          7. **DO NOT** share tool outputs publicly (may contain system information)
          
          **Best practice**: Always run READ-ONLY reports before DATA-MODIFYING operations.
        `
      },
      {
        title: 'Tool Reference',
        content: `
          **1. Integrity Report** (READ-ONLY)
          - **Purpose**: Scan for orphaned references and data inconsistencies
          - **Impact**: Database read load increase during scan
          - **What it affects**: Nothing (read-only)
          - **When to run**: Weekly, or when investigating data issues
          - **Endpoint**: GET /api/admin/integrity-report
          
          **2. Cleanliness Report** (READ-ONLY)
          - **Purpose**: Analyze unused data, empty collections, inactive flags, schema status
          - **Impact**: Database read load during analysis
          - **What it affects**: Nothing (read-only)
          - **When to run**: Weekly, before running repairs
          - **Endpoint**: GET /api/admin/cleanliness-report
          
          **3. Ensure Indexes** (STRUCTURAL)
          - **Purpose**: Create missing database indexes for performance
          - **Impact**: CPU usage during index creation, improved query speed after
          - **What it affects**: Database structure only (no data changes)
          - **When to run**: After schema changes, or if performance degrades
          - **Endpoint**: POST /api/admin/system/ensure-indexes
          
          **4. Setup TTL Indexes** (STRUCTURAL)
          - **Purpose**: Configure automatic data expiration rules
          - **Impact**: Future automatic deletion of expired records
          - **What it affects**: Archive collections (data may auto-delete in future)
          - **When to run**: Only when you want to enable automatic data cleanup
          - **Endpoint**: POST /api/admin/system/setup-ttl
          - **⚠️  WARNING**: Requires AUDIT_TTL_DAYS environment variable
          
          **5. TTL Status** (READ-ONLY)
          - **Purpose**: Check which collections have TTL enabled
          - **Impact**: None
          - **What it affects**: Nothing (read-only)
          - **When to run**: Anytime
          - **Endpoint**: GET /api/admin/system/ttl-status
          
          **6. Maintenance Status** (READ-ONLY)
          - **Purpose**: Check automated maintenance service status
          - **Impact**: None
          - **What it affects**: Nothing (read-only)
          - **When to run**: Anytime
          - **Endpoint**: GET /api/admin/system/maintenance-status
          
          **7. Run Maintenance** (DATA-MODIFYING)
          - **Purpose**: Execute maintenance routines (archiving, cleanup, health checks)
          - **Impact**: May clean internal temporary records
          - **What it affects**: Old bookings (>90 days), temporary system records
          - **When to run**: Monthly, or as needed for cleanup
          - **Endpoint**: POST /api/admin/system/run-maintenance
          
          **8. Repair Cart References** (DATA-MODIFYING)
          - **Purpose**: Remove cart items referencing deleted products
          - **Impact**: Removes broken cart entries
          - **What it affects**: User carts with invalid product references
          - **When to run**: After integrity report shows cart issues
          - **Endpoint**: POST /api/admin/repair/cart-references
          - **⚠️  WARNING**: Requires CLEANLINESS_ENABLE_REPAIR=true
          
          **9. Repair Empty Carts** (DATA-MODIFYING)
          - **Purpose**: Delete abandoned empty cart records
          - **Impact**: Removes empty cart entries from database
          - **What it affects**: Only carts with zero items
          - **When to run**: After cleanliness report shows many empty carts
          - **Endpoint**: POST /api/admin/repair/empty-carts
          - **⚠️  WARNING**: Requires CLEANLINESS_ENABLE_REPAIR=true
        `
      },
      {
        title: 'Security Note',
        content: `
          **Re-authentication gate**: The 10-minute password re-entry requirement exists to prevent accidental tool execution.
          
          **Important**: This is a UI safety feature. It does not change the backend security model.
          
          All system tools require admin JWT token authentication on the backend. The re-auth gate simply:
          - Refreshes your admin session token
          - Adds a time-based UI lock
          - Prevents accidental clicks
          
          **Your admin token**: Already provides full authorization. The re-auth ensures intentional action.
        `
      }
    ],
    links: []
  }
};

const AdminHelp = () => {
  const { topic } = useParams();
  const content = topic ? helpContent[topic] : null;

  if (!topic) {
    // Help center index
    return (
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl mb-8">Help Center</h1>
        
        <div className="space-y-4">
          {Object.entries(helpContent).map(([key, item]) => (
            <Link
              key={key}
              to={`/admin/help/${key}`}
              className="gem-card p-4 flex items-center gap-4 hover:border-white/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <item.icon className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.sections.length} sections</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Help topic not found</p>
        <Link to="/admin/help" className="text-blue-400 hover:text-blue-300 text-sm mt-4 inline-block">
          ← Back to Help Center
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link to="/admin/help" className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Help Center
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
          <content.icon className="w-6 h-6 text-gray-400" />
        </div>
        <h1 className="font-serif text-3xl">{content.title}</h1>
      </div>

      <div className="space-y-8">
        {content.sections.map((section, i) => (
          <div key={i} className="gem-card p-6">
            <h2 className="font-semibold text-lg mb-4">{section.title}</h2>
            <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
              {section.content.split('\n').map((line, j) => {
                // Handle links
                const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
                if (linkMatch) {
                  const before = line.substring(0, linkMatch.index);
                  const after = line.substring(linkMatch.index + linkMatch[0].length);
                  return (
                    <span key={j}>
                      {before}
                      <a href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        {linkMatch[1]}
                      </a>
                      {after}
                      <br />
                    </span>
                  );
                }
                // Handle bold
                const boldLine = line.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>');
                // Handle code
                const codeLine = boldLine.replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1 text-xs font-mono">$1</code>');
                return <span key={j} dangerouslySetInnerHTML={{ __html: codeLine + '<br/>' }} />;
              })}
            </div>
          </div>
        ))}
      </div>

      {content.links && content.links.length > 0 && (
        <div className="mt-8 gem-card p-6">
          <h3 className="font-semibold mb-4">Useful Links</h3>
          <div className="flex flex-wrap gap-4">
            {content.links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-white"
              >
                <ExternalLink className="w-4 h-4" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHelp;
