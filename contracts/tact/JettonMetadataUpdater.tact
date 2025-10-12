import "@stdlib/stdlib";

const OP_TRIGGER_UPDATE: Int = 0x4a4d5531; // 'JM U1'
const OP_SET_CONTENT: Int = 0x01;

contract JettonMetadataUpdater {
  owner: Address;
  jettonMaster: Address;

  init(owner: Address, jetton: Address) {
    self.requireBaseWorkchain(owner, "metadata: owner workchain");
    self.requireBaseWorkchain(jetton, "metadata: jetton workchain");
    self.owner = owner;
    self.jettonMaster = jetton;
  }

  receive(msg: InternalMessage) {
    if (msg.body.isEmpty()) {
      return;
    }

    slice body = msg.body.beginParse();
    if (body.bits() < 32) {
      return;
    }

    Int op = body.loadUint(32);
    if (op != OP_TRIGGER_UPDATE) {
      return;
    }

    self.requireOwner(msg.info.src);

    String newUri = body.loadStringTail();
    self.forwardMetadataUpdate(newUri);
  }

  get fun get_owner(): Address {
    return self.owner;
  }

  get fun get_jetton_master(): Address {
    return self.jettonMaster;
  }

  fun forwardMetadataUpdate(newUri: String) {
    Cell uriCell = beginCell().storeStringTail(newUri).endCell();
    Cell messageBody = beginCell()
      .storeUint(OP_SET_CONTENT, 32)
      .storeRef(uriCell)
      .endCell();

    sendRawMessage(
      InternalMessage{
        info: InternalMessageInfo{
          src: myAddress(),
          dest: self.jettonMaster,
          value: 0.1 ton,
          ihrDisabled: true,
        },
        body: messageBody,
      },
    );
  }

  fun requireOwner(sender: Address) {
    require(sender == self.owner, "metadata: unauthorized");
  }

  fun requireBaseWorkchain(addr: Address, err: String) {
    StdAddress parsed = parseStdAddress(addr.asSlice());
    require(parsed.workchain == 0, err);
  }
}
