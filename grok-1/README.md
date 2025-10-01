# Grok-1

This repository contains JAX example code for loading and running the Grok-1
open-weights model.

Make sure to download the checkpoint and place the `ckpt-0` directory in
`checkpoints` - see [Downloading the weights](#downloading-the-weights)

Then, run

```shell
pip install -r requirements.txt
python run.py
```

to test the code. On developer workstations that only expose a single GPU, keep
`bs_per_device` at `1` or higher in `run.py` (or rely on the built-in clamp in
`ModelRunner`) so the sampler retains a non-zero batch size.

The script loads the checkpoint and samples from the model on a test input.

Due to the large size of the model (314B parameters), a machine with enough GPU
memory is required to test the model with the example code. The implementation
of the MoE layer in this repository is not efficient. The implementation was
chosen to avoid the need for custom kernels to validate the correctness of the
model.

# Utility helpers

Two deterministic helpers emulate Grok-guided business planning so the
repository remains testable without the 314B parameter weights:

## VIP pricing generator (`vip_pricing.py`)

The VIP generator accepts market demand and loyalty signals and emits a ladder
of VIP bundles, each with tier names, perk bundles, price recommendations, and
promo codes. See `tests/test_vip_pricing.py` for concrete expectations.

## Founders Circle allocator (`founders_circle.py`)

`generate_founders_circle_plan` synthesises a token-aligned allocation plan for
the “Founders Circle” programme. The helper:

- Loads the canonical token supply and treasury split defaults from
  `dynamic-capital-ton/config.yaml` unless callers inject custom values.
- Accepts membership counts for the VIP channel, VIP group, mentorship channel,
  mentorship group, and trading pool channel.
- Weights each cohort with engagement multipliers and guard rails to ensure
  every group receives a baseline share of the allocation pool.
- Returns a `FoundersCirclePlan` object containing the total pool size,
  per-channel allocation, per-member award, and suggested eligibility notes.

Example usage:

```python
from founders_circle import generate_founders_circle_plan, summarize_plan

plan = generate_founders_circle_plan(
    vip_channel_members=120,
    vip_group_members=95,
    mentorship_channel_members=60,
    mentorship_group_members=75,
    trading_pool_members=40,
)

print(summarize_plan(plan))
```

Example output:

```
Founders Circle Pool: 6,000,000.00 DCT (6.00% of supply)
- VIP Channel: 1,716,393.44 DCT (120 members, multiplier 1.20) → 14,303.28 per member. Invite-only: charter members with ≥500 DCT staked and quarterly reviews.
- VIP Group: 1,234,426.23 DCT (95 members, multiplier 1.00) → 12,993.96 per member. Invite-only: charter members with ≥500 DCT staked and quarterly reviews.
- Mentorship Channel: 1,067,213.11 DCT (60 members, multiplier 1.30) → 17,786.89 per member. Invite-only: charter members with ≥500 DCT staked and quarterly reviews.
- Mentorship Group: 1,111,475.41 DCT (75 members, multiplier 1.10) → 14,819.67 per member. Invite-only: charter members with ≥500 DCT staked and quarterly reviews.
- Trading Pool: 870,491.80 DCT (40 members, multiplier 1.45) → 21,762.30 per member. Invite-only: charter members with ≥500 DCT staked and quarterly reviews.
```

# Model Specifications

Grok-1 is currently designed with the following specifications:

- **Parameters:** 314B
- **Architecture:** Mixture of 8 Experts (MoE)
- **Experts Utilization:** 2 experts used per token
- **Layers:** 64
- **Attention Heads:** 48 for queries, 8 for keys/values
- **Embedding Size:** 6,144
- **Tokenization:** SentencePiece tokenizer with 131,072 tokens
- **Additional Features:**
  - Rotary embeddings (RoPE)
  - Supports activation sharding and 8-bit quantization
- **Maximum Sequence Length (context):** 8,192 tokens

# Downloading the weights

You can download the weights using a torrent client and this magnet link:

```
magnet:?xt=urn:btih:5f96d43576e3d386c9ba65b883210a393b68210e&tr=https%3A%2F%2Facademictorrents.com%2Fannounce.php&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce
```

or directly using [HuggingFace 🤗 Hub](https://huggingface.co/xai-org/grok-1):

```
git clone https://github.com/xai-org/grok-1.git && cd grok-1
pip install huggingface_hub[hf_transfer]
huggingface-cli download xai-org/grok-1 --repo-type model --include ckpt-0/* --local-dir checkpoints --local-dir-use-symlinks False
```

## Tokenizer

The SentencePiece tokenizer file (`tokenizer.model`) is not included in this
repository because it is a large binary artifact. Download it directly from the
Grok-1 release before running the example scripts:

```shell
huggingface-cli download xai-org/grok-1 --repo-type model --include tokenizer.model --local-dir . --local-dir-use-symlinks False
```

Place the downloaded `tokenizer.model` in the repository root
(`grok-1/tokenizer.model`).

# License

The code and associated Grok-1 weights in this release are licensed under the
Apache 2.0 license. The license only applies to the source files in this
repository and the model weights of Grok-1.
