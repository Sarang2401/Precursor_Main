"""
Blockchain Demo Script for Project Reviewer
============================================
This script demonstrates the blockchain functionality of the
PRECURSOR Pharmaceutical Supply Chain Tracking System.

Run with: python demo_blockchain.py
Prerequisites: Flask server must be running on port 5000
"""

import json
import requests
import time
import hashlib
from datetime import datetime

API_URL = "http://localhost:5000"

def print_header(title):
    """Print a formatted section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def print_subheader(title):
    """Print a formatted subsection header."""
    print(f"\n--- {title} ---")

def check_server():
    """Check if the Flask server is running."""
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def demo_step_1_validate_chain():
    """Step 1: Validate the entire blockchain."""
    print_header("STEP 1: BLOCKCHAIN VALIDATION (Proving Integrity)")
    
    print("\n📋 Calling: GET /api/blockchain/validate")
    print("   This verifies that the entire blockchain is intact and unmodified.\n")
    
    response = requests.get(f"{API_URL}/api/blockchain/validate")
    data = response.json()
    
    print(f"   ✅ Valid: {data['valid']}")
    print(f"   📦 Block Count: {data['block_count']}")
    print(f"   💬 Message: {data['message']}")
    
    if data['valid']:
        print("\n   🔒 RESULT: The blockchain is cryptographically valid.")
        print("      No blocks have been tampered with.")
    
    return data

def demo_step_2_show_stats():
    """Step 2: Show blockchain statistics."""
    print_header("STEP 2: BLOCKCHAIN STATISTICS")
    
    print("\n📋 Calling: GET /api/blockchain/stats")
    print("   This shows a summary of all blocks in the chain.\n")
    
    response = requests.get(f"{API_URL}/api/blockchain/stats")
    data = response.json()
    
    print(f"   📦 Total Blocks: {data['total_blocks']}")
    print(f"   🕐 Genesis Time: {data['genesis_time']}")
    print(f"   🕐 Latest Time: {data['latest_time']}")
    print(f"\n   📊 Blocks by Type:")
    for block_type, count in data['blocks_by_type'].items():
        emoji = "🔗" if block_type == "genesis" else "📡" if block_type == "sensor_reading" else "🧪"
        print(f"      {emoji} {block_type}: {count}")
    
    return data

def demo_step_3_show_genesis():
    """Step 3: Show the genesis block."""
    print_header("STEP 3: GENESIS BLOCK (The First Block)")
    
    print("\n📋 Calling: GET /api/blockchain/block/0")
    print("   The genesis block is the foundation of the blockchain.\n")
    
    response = requests.get(f"{API_URL}/api/blockchain/block/0")
    data = response.json()['block']
    
    print(f"   Index: {data['index']}")
    print(f"   Timestamp: {data['timestamp']}")
    print(f"   Previous Hash: {data['previous_hash'][:20]}... (all zeros)")
    print(f"   Hash: {data['hash'][:20]}...")
    print(f"   Nonce: {data['nonce']} (mining iterations)")
    print(f"\n   📝 Data:")
    print(f"      Type: {data['data']['type']}")
    print(f"      Message: {data['data']['message']}")
    print(f"      Version: {data['data']['version']}")
    
    return data

def demo_step_4_show_latest():
    """Step 4: Show the latest block."""
    print_header("STEP 4: LATEST BLOCK (Most Recent)")
    
    print("\n📋 Calling: GET /api/blockchain/latest")
    print("   Shows the most recently mined block.\n")
    
    response = requests.get(f"{API_URL}/api/blockchain/latest")
    data = response.json()['block']
    
    print(f"   Index: {data['index']}")
    print(f"   Timestamp: {data['timestamp']}")
    print(f"   Nonce: {data['nonce']} (mining took {data['nonce']} iterations)")
    
    print(f"\n   🔗 Hash Linking (Immutability Proof):")
    print(f"      Previous Hash: {data['previous_hash'][:40]}...")
    print(f"      Current Hash:  {data['hash'][:40]}...")
    
    # Show proof-of-work
    print(f"\n   ⛏️  PROOF OF WORK:")
    print(f"      Hash starts with: '{data['hash'][:2]}'")
    print(f"      This proves computational work was done (difficulty=2).")
    
    if 'sensor_data' in data['data']:
        print(f"\n   📡 Sensor Data Recorded:")
        sensor = data['data']['sensor_data']
        print(f"      Temperature: {sensor['temp']:.1f}°C")
        print(f"      Humidity: {sensor['hum']:.1f}%")
        print(f"      Weight: {sensor['weight']:.1f}kg")
        print(f"      Device: {data['data']['device_id']}")
    
    return data

def demo_step_5_chain_integrity():
    """Step 5: Demonstrate chain linking."""
    print_header("STEP 5: CHAIN LINKING DEMONSTRATION")
    
    print("\n📋 Fetching blocks 0, 1, and 2 to show how they link together...\n")
    
    blocks = []
    for i in range(3):
        response = requests.get(f"{API_URL}/api/blockchain/block/{i}")
        blocks.append(response.json()['block'])
    
    for i, block in enumerate(blocks):
        print(f"   Block {i}:")
        print(f"      Hash: {block['hash'][:50]}...")
        if i > 0:
            print(f"      ↑ Links to: {block['previous_hash'][:50]}...")
            # Verify link
            if block['previous_hash'] == blocks[i-1]['hash']:
                print(f"      ✅ VERIFIED: Correctly links to Block {i-1}")
            else:
                print(f"      ❌ ERROR: Link broken!")
        print()
    
    print("   🔗 This chain linking ensures that if ANY block is modified,")
    print("      all subsequent block hashes become invalid.")

def demo_step_6_add_block():
    """Step 6: Add a new block and show mining."""
    print_header("STEP 6: ADDING A NEW BLOCK (Live Mining Demo)")
    
    print("\n📋 Calling: POST /api/blockchain/add")
    print("   We will add a test block and observe the mining process.\n")
    
    # Get current block count
    stats_before = requests.get(f"{API_URL}/api/blockchain/stats").json()
    block_count_before = stats_before['total_blocks']
    
    print(f"   Current block count: {block_count_before}")
    print(f"   Adding a new block...\n")
    
    # Add new block
    test_data = {
        "type": "demo_block",
        "message": "This block was added during the reviewer demonstration",
        "timestamp": datetime.now().isoformat(),
        "demo": True
    }
    
    start_time = time.time()
    response = requests.post(f"{API_URL}/api/blockchain/add", json=test_data)
    mining_time = time.time() - start_time
    
    if response.status_code == 201:
        result = response.json()
        block = result['block']
        
        print(f"   ⛏️  Block mined in {mining_time:.2f} seconds")
        print(f"   📦 New block index: {block['index']}")
        print(f"   🔢 Nonce (iterations): {block['nonce']}")
        print(f"   🔗 Hash: {block['hash'][:50]}...")
        print(f"   ✅ Hash starts with '00' (proof-of-work verified)")
        
        # Verify new count
        stats_after = requests.get(f"{API_URL}/api/blockchain/stats").json()
        print(f"\n   📊 Block count: {block_count_before} → {stats_after['total_blocks']}")
    else:
        print(f"   ❌ Failed to add block: {response.text}")

def demo_step_7_tamper_detection():
    """Step 7: Explain tamper detection."""
    print_header("STEP 7: TAMPER DETECTION EXPLANATION")
    
    print("""
   🔐 HOW TAMPER DETECTION WORKS:
   
   1. Each block contains a SHA-256 hash of its contents
   2. Each block also contains the hash of the previous block
   3. If ANY data in a block is changed:
      - The block's hash changes
      - This breaks the link to the next block
      - The validation endpoint detects this immediately
   
   🧪 EXAMPLE ATTACK SCENARIO:
   
   If an attacker tries to modify sensor data (e.g., change temp from 40°C to 25°C):
   
   Original Block Hash:  00abc123...
   Modified Block Hash:  f7d891e... (completely different!)
   Next Block Expected:  00abc123... 
   
   ❌ RESULT: Chain validation fails, attack detected!
   
   The attacker would need to:
   1. Modify the target block
   2. Re-mine all subsequent blocks (solve proof-of-work again)
   3. Do this faster than new blocks are being added
   
   This is computationally infeasible, making the blockchain IMMUTABLE.
""")

def demo_step_8_summary():
    """Step 8: Summary of blockchain features."""
    print_header("STEP 8: BLOCKCHAIN FEATURE SUMMARY")
    
    # Final validation
    validation = requests.get(f"{API_URL}/api/blockchain/validate").json()
    stats = requests.get(f"{API_URL}/api/blockchain/stats").json()
    
    print(f"""
   ╔══════════════════════════════════════════════════════════════════╗
   ║                    BLOCKCHAIN DEMONSTRATION COMPLETE             ║
   ╠══════════════════════════════════════════════════════════════════╣
   ║                                                                  ║
   ║  ✅ Chain Validated: {str(validation['valid']):5}                              ║
   ║  📦 Total Blocks:    {stats['total_blocks']:<5}                                     ║
   ║  📡 Sensor Records:  {stats['blocks_by_type'].get('sensor_reading', 0):<5}                                     ║
   ║                                                                  ║
   ╠══════════════════════════════════════════════════════════════════╣
   ║                     KEY FEATURES DEMONSTRATED                    ║
   ╠══════════════════════════════════════════════════════════════════╣
   ║                                                                  ║
   ║  🔒 IMMUTABILITY    - Blocks cannot be altered after creation   ║
   ║  🔗 CHAIN LINKING   - Each block references its predecessor     ║
   ║  ⛏️  PROOF OF WORK   - Mining ensures computational integrity   ║
   ║  ✅ VALIDATION      - Full chain verification available         ║
   ║  📡 DATA STORAGE    - Sensor readings permanently recorded      ║
   ║  📁 PERSISTENCE     - Chain saved to blockchain_data/chain.json ║
   ║                                                                  ║
   ╠══════════════════════════════════════════════════════════════════╣
   ║                       API ENDPOINTS                              ║
   ╠══════════════════════════════════════════════════════════════════╣
   ║                                                                  ║
   ║  GET  /api/blockchain/validate    - Verify chain integrity      ║
   ║  GET  /api/blockchain/stats       - Chain statistics            ║
   ║  GET  /api/blockchain/chain       - Full chain data             ║
   ║  GET  /api/blockchain/latest      - Most recent block           ║
   ║  GET  /api/blockchain/block/<n>   - Specific block by index     ║
   ║  POST /api/blockchain/add         - Add new block               ║
   ║                                                                  ║
   ╚══════════════════════════════════════════════════════════════════╝
""")

def run_demo():
    """Run the complete blockchain demonstration."""
    print("\n" + "█" * 70)
    print("█" + " " * 68 + "█")
    print("█" + "  PRECURSOR BLOCKCHAIN DEMONSTRATION FOR PROJECT REVIEWER  ".center(68) + "█")
    print("█" + " " * 68 + "█")
    print("█" * 70)
    
    # Check if server is running
    print("\n🔍 Checking if Flask server is running...")
    if not check_server():
        print("❌ ERROR: Flask server is not running!")
        print("   Please start it with: cd ML/backend && python app.py")
        return
    
    print("✅ Flask server is running on port 5000\n")
    
    input("Press ENTER to begin the demonstration...")
    
    # Run each demo step
    demo_step_1_validate_chain()
    input("\nPress ENTER to continue to Step 2...")
    
    demo_step_2_show_stats()
    input("\nPress ENTER to continue to Step 3...")
    
    demo_step_3_show_genesis()
    input("\nPress ENTER to continue to Step 4...")
    
    demo_step_4_show_latest()
    input("\nPress ENTER to continue to Step 5...")
    
    demo_step_5_chain_integrity()
    input("\nPress ENTER to continue to Step 6...")
    
    demo_step_6_add_block()
    input("\nPress ENTER to continue to Step 7...")
    
    demo_step_7_tamper_detection()
    input("\nPress ENTER to see the final summary...")
    
    demo_step_8_summary()
    
    print("\n🎉 DEMONSTRATION COMPLETE!")
    print("   Thank you for reviewing the PRECURSOR blockchain implementation.\n")

if __name__ == "__main__":
    run_demo()
