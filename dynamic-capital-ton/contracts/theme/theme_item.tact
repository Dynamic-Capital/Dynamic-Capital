import "@stdlib";
import "@stdlib/nft";

const OP_SYNC_CONTENT: Int = 0x544d4931; // 'TMI1'
const OP_SYNC_FREEZE: Int = 0x544d4932; // 'TMI2'

contract ThemeItem with NftItem {
  collection: Address;
  owner: Address;
  index: Int;
  content: Cell;
  priority: Int;
  frozen: Bool;

  init(
    collection: Address,
    owner: Address,
    index: Int,
    content: Cell,
    priority: Int,
    frozen: Bool,
  ) {
    self.requireBaseWorkchain(collection, "theme-item: collection workchain");
    self.requireBaseWorkchain(owner, "theme-item: owner workchain");
    self.collection = collection;
    self.owner = owner;
    self.index = index;
    self.content = content;
    self.priority = priority;
    self.frozen = frozen;
  }

  receive(msg: InternalMessage) {
    if (msg.body == null() || msg.body.bits() == 0) {
      return;
    }

    slice body = msg.body.beginParse();
    if (body.bits() < 32) {
      return;
    }

    Int op = body.loadUint(32);

    if (op == OP_SYNC_CONTENT) {
      self.requireCollection(msg.info.src);
      Cell newContent = body.loadRef();
      Int newPriority = body.loadInt(32);
      Bool frozen = body.loadBit();
      if (!self.frozen) {
        self.content = newContent;
        self.priority = newPriority;
        self.frozen = frozen;
      }
      return;
    }

    if (op == OP_SYNC_FREEZE) {
      self.requireCollection(msg.info.src);
      self.frozen = true;
      return;
    }
  }

  fun requireCollection(sender: Address) {
    require(sender == self.collection, "theme-item: unauthorized");
  }

  fun requireBaseWorkchain(addr: Address, err: String) {
    StdAddress components = parseStdAddress(addr.asSlice());
    require(components.workchain == 0, err);
  }

  get fun get_nft_data(): (Int, Address, Address, Slice, Int, Bool) {
    return (self.index, self.collection, self.owner, self.content.beginParse(), self.priority, self.frozen);
  }

  get fun get_priority(): Int {
    return self.priority;
  }

  get fun get_content(): Slice {
    return self.content.beginParse();
  }
}
