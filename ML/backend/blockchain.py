"""
Simple Python Blockchain for Supply Chain Data Decentralization
================================================================
Provides immutable, verifiable storage for pharmaceutical supply chain events.
"""

import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# Storage directory for blockchain data
BLOCKCHAIN_DATA_DIR = os.path.join(os.path.dirname(__file__), 'blockchain_data')
CHAIN_FILE = os.path.join(BLOCKCHAIN_DATA_DIR, 'chain.json')


class Block:
    """Represents a single block in the blockchain."""
    
    def __init__(
        self,
        index: int,
        timestamp: str,
        data: Dict[str, Any],
        previous_hash: str,
        nonce: int = 0,
        block_hash: Optional[str] = None
    ):
        self.index = index
        self.timestamp = timestamp
        self.data = data
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.hash = block_hash or self.calculate_hash()
    
    def calculate_hash(self) -> str:
        """Generate SHA-256 hash of block contents."""
        block_string = json.dumps({
            'index': self.index,
            'timestamp': self.timestamp,
            'data': self.data,
            'previous_hash': self.previous_hash,
            'nonce': self.nonce
        }, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert block to dictionary for serialization."""
        return {
            'index': self.index,
            'timestamp': self.timestamp,
            'data': self.data,
            'previous_hash': self.previous_hash,
            'nonce': self.nonce,
            'hash': self.hash
        }
    
    @classmethod
    def from_dict(cls, block_dict: Dict[str, Any]) -> 'Block':
        """Create Block from dictionary."""
        return cls(
            index=block_dict['index'],
            timestamp=block_dict['timestamp'],
            data=block_dict['data'],
            previous_hash=block_dict['previous_hash'],
            nonce=block_dict['nonce'],
            block_hash=block_dict['hash']
        )


class Blockchain:
    """Simple blockchain with proof-of-work mining."""
    
    # Difficulty: hash must start with this many zeros
    DIFFICULTY = 2
    
    def __init__(self):
        self.chain: List[Block] = []
        self._ensure_storage_dir()
        self._load_chain()
    
    def _ensure_storage_dir(self):
        """Create storage directory if it doesn't exist."""
        if not os.path.exists(BLOCKCHAIN_DATA_DIR):
            os.makedirs(BLOCKCHAIN_DATA_DIR)
    
    def _load_chain(self):
        """Load blockchain from file or create genesis block."""
        if os.path.exists(CHAIN_FILE):
            try:
                with open(CHAIN_FILE, 'r') as f:
                    chain_data = json.load(f)
                    self.chain = [Block.from_dict(b) for b in chain_data]
                    print(f"✅ Loaded blockchain with {len(self.chain)} blocks")
            except (json.JSONDecodeError, KeyError) as e:
                print(f"⚠️ Error loading chain, creating new: {e}")
                self._create_genesis_block()
        else:
            self._create_genesis_block()
    
    def _save_chain(self):
        """Persist blockchain to file."""
        with open(CHAIN_FILE, 'w') as f:
            json.dump([b.to_dict() for b in self.chain], f, indent=2)
    
    def _create_genesis_block(self):
        """Create the first block in the chain."""
        genesis_data = {
            'type': 'genesis',
            'message': 'Precursor Supply Chain Blockchain Initialized',
            'version': '1.0.0'
        }
        genesis_block = Block(
            index=0,
            timestamp=datetime.now(timezone.utc).isoformat(),
            data=genesis_data,
            previous_hash='0' * 64
        )
        # Mine genesis block
        genesis_block = self._mine_block(genesis_block)
        self.chain.append(genesis_block)
        self._save_chain()
        print("🔗 Genesis block created")
    
    def _mine_block(self, block: Block) -> Block:
        """
        Proof-of-work: Find nonce that produces hash starting with DIFFICULTY zeros.
        """
        target = '0' * self.DIFFICULTY
        while not block.hash.startswith(target):
            block.nonce += 1
            block.hash = block.calculate_hash()
        return block
    
    def get_latest_block(self) -> Block:
        """Return the most recent block."""
        return self.chain[-1]
    
    def add_block(self, data: Dict[str, Any]) -> Block:
        """
        Add new block with supply chain data.
        
        Args:
            data: Dictionary containing event data (sensor readings, shipment info, etc.)
        
        Returns:
            The newly created and mined block
        """
        previous_block = self.get_latest_block()
        new_block = Block(
            index=len(self.chain),
            timestamp=datetime.now(timezone.utc).isoformat(),
            data=data,
            previous_hash=previous_block.hash
        )
        
        # Mine the block (proof-of-work)
        new_block = self._mine_block(new_block)
        
        # Add to chain and persist
        self.chain.append(new_block)
        self._save_chain()
        
        print(f"⛏️ Block #{new_block.index} mined: {new_block.hash[:16]}...")
        return new_block
    
    def validate_chain(self) -> tuple[bool, str]:
        """
        Validate the entire blockchain integrity.
        
        Returns:
            Tuple of (is_valid, message)
        """
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]
            
            # Verify current block's hash
            if current.hash != current.calculate_hash():
                return False, f"Block {i} has invalid hash"
            
            # Verify link to previous block
            if current.previous_hash != previous.hash:
                return False, f"Block {i} has broken chain link"
            
            # Verify proof-of-work
            if not current.hash.startswith('0' * self.DIFFICULTY):
                return False, f"Block {i} has invalid proof-of-work"
        
        return True, f"Chain valid with {len(self.chain)} blocks"
    
    def get_chain(self) -> List[Dict[str, Any]]:
        """Return full chain as list of dictionaries."""
        return [block.to_dict() for block in self.chain]
    
    def get_block(self, index: int) -> Optional[Dict[str, Any]]:
        """Get specific block by index."""
        if 0 <= index < len(self.chain):
            return self.chain[index].to_dict()
        return None
    
    def get_blocks_by_type(self, event_type: str) -> List[Dict[str, Any]]:
        """Filter blocks by event type in data."""
        return [
            b.to_dict() for b in self.chain 
            if b.data.get('type') == event_type
        ]


# Singleton instance for the application
blockchain = Blockchain()
