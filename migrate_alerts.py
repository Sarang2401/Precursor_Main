"""
Migrate Historical ML Alerts to Node.js Database
=================================================
This script reads all existing alerts from alerts_logs.jsonl and pushes them
to the Node.js backend database for persistence.
"""

import json
import requests
import os

ALERTS_FILE = "ML/backend/alerts/alerts_logs.jsonl"
NODE_BACKEND = "http://localhost:3000"

def migrate_alerts():
    if not os.path.exists(ALERTS_FILE):
        print(f"❌ Alert file not found: {ALERTS_FILE}")
        print("   No historical alerts to migrate.")
        return
    
    print(f"📂 Reading alerts from {ALERTS_FILE}...")
    
    migrated = 0
    skipped = 0
    failed = 0
    
    with open(ALERTS_FILE, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                alert = json.loads(line.strip())
                
                # Push to Node.js backend
                response = requests.post(
                    f"{NODE_BACKEND}/api/ml-alerts",
                    json=alert,
                    timeout=2
                )
                
                if response.status_code in [200, 201]:
                    if "already exists" in response.text:
                        skipped += 1
                        print(f"⏭️  Line {line_num}: {alert['alert_id']} already exists")
                    else:
                        migrated += 1
                        print(f"✅ Line {line_num}: Migrated {alert['alert_id']}")
                else:
                    failed += 1
                    print(f"❌ Line {line_num}: Failed - {response.text}")
                    
            except json.JSONDecodeError:
                print(f"⚠️  Line {line_num}: Invalid JSON, skipping")
                skipped += 1
            except Exception as e:
                print(f"❌ Line {line_num}: Error - {e}")
                failed += 1
    
    print("\n" + "="*60)
    print("MIGRATION SUMMARY")
    print("="*60)
    print(f"✅ Migrated: {migrated}")
    print(f"⏭️  Skipped: {skipped}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Total: {migrated + skipped + failed}")
    print("="*60)

if __name__ == "__main__":
    print("="*60)
    print("ML ALERTS MIGRATION TO NODE.JS DATABASE")
    print("="*60)
    print("\nMake sure Node.js backend is running on port 3000!")
    input("Press Enter to start migration...")
    
    migrate_alerts()
    
    print("\n✅ Migration complete! Refresh your app to see all alerts.")
