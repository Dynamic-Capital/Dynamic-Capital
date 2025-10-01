# TON BOC Payload Decoding

The payload provided in the task resolves to a single-cell Bag of Cells (BOC)
structure.  The new `tools/ton/decode_boc.py` helper summarises the cell
metadata and extracts the leading fields that resemble a jetton transfer
envelope.  Running the script against the supplied base64 string yields:

```bash
python tools/ton/decode_boc.py \
  te6ccgEBAQEAKwAAUYAAAAO///+I0cOOhonc+l1z7ugXiAaIHSShHtY7/wffOpy/paYJRYCg
```

```
Cell hash           : 08bcf517bc60d1a32e3fb9d16d91b1de88b7e9ca65baf6700eb105ad48cd6d0d
Cell depth          : 0
Payload bytes       : 41
Payload bits        : 328
Opcode              : 0x80000003
Query ID            : 13835057543405342342
Jetton amount bytes : 8
Jetton amount       : 11371489928026161528
Remaining bits      : 164
Remaining payload   : 806881d24a11ed63bff07df3a9cbfa5a6094580a0
```

Additional reference data:

- Base64 source: `te6ccgEBAQEAKwAAUYAAAAO///+I0cOOhonc+l1z7ugXiAaIHSShHtY7/wffOpy/paYJRYCg`
- Hex encoding: `b5ee9c7201010101002b00005180000003bfffff88d1c38e8689dcfa5d73eee8178806881d24a11ed63bff07df3a9cbfa5a6094580a0`
- Cell hash (matches provided reference):
  `08bcf517bc60d1a32e3fb9d16d91b1de88b7e9ca65baf6700eb105ad48cd6d0d`

The remaining 164 bits can be examined further with specialised tooling if the
envelope needs to be parsed beyond the leading opcode, query identifier, and
jetton amount.
