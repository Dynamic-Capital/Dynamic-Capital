# Platform · Token Treasury

`dynamic/platform/token/` holds the Dynamic Capital Token (DCT) engines. It
covers treasury execution, committee signal handling, and NFT minting utilities.

Contents include:

- `engine.py`: Coordinates pricing, allocation planning, and treasury accounting.
- `treasury.py`: Applies burn/reward schedules and loss absorption policies.
- `nft.py` & `image.py`: Provide dynamic NFT minting and artwork generation.

Extend this module when adding new policy levers or analytics that interact with
the treasury life cycle. Keep public exports defined in `__init__.py` to avoid
leaking experimental helpers.
