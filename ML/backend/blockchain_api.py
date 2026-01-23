"""
Blockchain API Blueprint
========================
Flask endpoints for interacting with the supply chain blockchain.
"""

from flask import Blueprint, request, jsonify
from blockchain import blockchain

blockchain_bp = Blueprint('blockchain', __name__, url_prefix='/api/blockchain')


@blockchain_bp.route('/add', methods=['POST'])
def add_block():
    """
    Add a new block to the blockchain.
    
    Request body should contain the data to store:
    {
        "type": "sensor_alert" | "shipment_event" | "checkpoint",
        "device_id": "...",
        "data": { ... }
    }
    """
    payload = request.json
    
    if not payload:
        return jsonify({'error': 'No data provided'}), 400
    
    # Ensure type field exists for categorization
    if 'type' not in payload:
        payload['type'] = 'generic'
    
    try:
        block = blockchain.add_block(payload)
        return jsonify({
            'success': True,
            'message': 'Block added to chain',
            'block': block.to_dict()
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@blockchain_bp.route('/chain', methods=['GET'])
def get_chain():
    """
    Get the full blockchain.
    
    Query params:
        - limit: Number of recent blocks to return (optional)
        - type: Filter by event type (optional)
    """
    event_type = request.args.get('type')
    limit = request.args.get('limit', type=int)
    
    if event_type:
        chain = blockchain.get_blocks_by_type(event_type)
    else:
        chain = blockchain.get_chain()
    
    if limit:
        chain = chain[-limit:]
    
    return jsonify({
        'length': len(chain),
        'chain': chain
    })


@blockchain_bp.route('/validate', methods=['GET'])
def validate_chain():
    """Validate the blockchain integrity."""
    is_valid, message = blockchain.validate_chain()
    return jsonify({
        'valid': is_valid,
        'message': message,
        'block_count': len(blockchain.chain)
    })


@blockchain_bp.route('/block/<int:index>', methods=['GET'])
def get_block(index):
    """Get a specific block by index."""
    block = blockchain.get_block(index)
    
    if block is None:
        return jsonify({'error': f'Block {index} not found'}), 404
    
    return jsonify({'block': block})


@blockchain_bp.route('/latest', methods=['GET'])
def get_latest():
    """Get the latest block in the chain."""
    block = blockchain.get_latest_block()
    return jsonify({'block': block.to_dict()})


@blockchain_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get blockchain statistics."""
    chain = blockchain.get_chain()
    
    # Count blocks by type
    type_counts = {}
    for block in chain:
        block_type = block['data'].get('type', 'unknown')
        type_counts[block_type] = type_counts.get(block_type, 0) + 1
    
    return jsonify({
        'total_blocks': len(chain),
        'genesis_time': chain[0]['timestamp'] if chain else None,
        'latest_time': chain[-1]['timestamp'] if chain else None,
        'blocks_by_type': type_counts
    })
