import "@stdlib";
import "@stdlib/nft";

const OP_SET_CONTENT: Int = 0x544d4331; // 'TMC1'
const OP_FREEZE: Int = 0x544d4332; // 'TMC2'
const OP_EVENT_CONTENT_SET: Int = 0x544d4531; // 'TME1'
const OP_EVENT_FROZEN: Int = 0x544d4532; // 'TME2'

struct ThemeContentEvent {
  op: Int;
  itemId: Int;
  priority: Int;
  content: Slice;
}

struct ThemeFrozenEvent {
  op: Int;
  itemId: Int;
  frozen: Bool;
}

contract ThemeCollection with NftCollection {
  owner: Address;
  dao: Address;
  nextItemId: Int;
  collectionContent: Cell;
  nftItemCode: Cell;
  royaltyParams: RoyaltyParams;
  contentUris: map<Int, Cell>;
  frozenItems: map<Int, Bool>;
  priorities: map<Int, Int>;

  init(
    owner: Address,
    dao: Address,
    collectionContent: Cell,
    itemCode: Cell,
    royalty: RoyaltyParams,
  ) {
    self.requireBaseWorkchain(owner, "theme: owner workchain");
    self.requireBaseWorkchain(dao, "theme: dao workchain");
    self.owner = owner;
    self.dao = dao;
    self.collectionContent = collectionContent;
    self.nftItemCode = itemCode;
    self.royaltyParams = royalty;
    self.nextItemId = 0;
    self.contentUris = map();
    self.frozenItems = map();
    self.priorities = map();
  }

  receive(msg: InternalMessage) {
    slice body = msg.body.beginParse();
    Int op = body.loadUint(32);

    if (op == OP_SET_CONTENT) {
      self.handleSetContent(msg.info.src, body);
      return;
    }

    if (op == OP_FREEZE) {
      self.handleFreeze(msg.info.src, body);
      return;
    }
  }

  fun handleSetContent(sender: Address, body: slice) {
    self.requireDao(sender);
    Int itemId = body.loadUint(64);
    Cell contentCell = body.loadRef();
    Int priority = body.loadInt(32);

    Bool isFrozen = self.readFrozen(itemId);
    require(!isFrozen, "theme: frozen");

    self.contentUris.set(itemId, contentCell);
    self.priorities.set(itemId, priority);

    ThemeContentEvent event = ThemeContentEvent{
      op: OP_EVENT_CONTENT_SET,
      itemId: itemId,
      priority: priority,
      content: contentCell.beginParse(),
    };
    emit(event);
  }

  fun handleFreeze(sender: Address, body: slice) {
    self.requireDao(sender);
    Int itemId = body.loadUint(64);
    self.frozenItems.set(itemId, true);

    ThemeFrozenEvent event = ThemeFrozenEvent{
      op: OP_EVENT_FROZEN,
      itemId: itemId,
      frozen: true,
    };
    emit(event);
  }

  fun readFrozen(itemId: Int): Bool {
    Bool? stored = self.frozenItems.get(itemId);
    if (stored == null()) {
      return false;
    }
    return stored as Bool;
  }

  fun requireDao(sender: Address) {
    require(sender == self.dao, "theme: unauthorized");
  }

  fun requireBaseWorkchain(addr: Address, err: String) {
    StdAddress components = parseStdAddress(addr.asSlice());
    require(components.workchain == 0, err);
  }

  get fun get_collection_data(): (Int, Cell, Address, Cell) {
    return (self.nextItemId, self.collectionContent, self.owner, self.nftItemCode);
  }

  get fun get_nft_item_content(itemId: Int): Cell {
    Cell? content = self.contentUris.get(itemId);
    if (content == null()) {
      return beginCell().endCell();
    }
    return content as Cell;
  }

  get fun get_nft_priority(itemId: Int): Int {
    Int? priority = self.priorities.get(itemId);
    if (priority == null()) {
      return 0;
    }
    return priority as Int;
  }

  get fun get_nft_frozen(itemId: Int): Bool {
    return self.readFrozen(itemId);
  }

  get fun get_royalty_params(): RoyaltyParams {
    return self.royaltyParams;
  }
}
