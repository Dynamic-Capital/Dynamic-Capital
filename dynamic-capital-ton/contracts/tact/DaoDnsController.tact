import "@stdlib";

const OP_EXECUTE_DNS_UPDATE: Int = 0x444e5331; // 'DNS1'
const OP_EVENT_DNS_UPDATE: Int = 0x444e5345; // 'DNSE'

struct DnsUpdateEvent {
  op: Int;
  executor: Address;
  record: Slice;
  forwardedValue: Int;
  quorumPercent: Int;
  timestamp: Int;
}

contract DaoDnsController {
  daoMultisig: Address;
  treasuryWallet: Address;
  quorum: Int;

  init(dao: Address, treasury: Address, quorumPct: Int) {
    self.requireBaseWorkchain(dao, "dns-controller: dao workchain");
    self.requireBaseWorkchain(treasury, "dns-controller: treasury workchain");
    require(quorumPct > 0 && quorumPct <= 100, "dns-controller: quorum range");
    self.daoMultisig = dao;
    self.treasuryWallet = treasury;
    self.quorum = quorumPct;
  }

  receive(msg: InternalMessage) {
    if (msg.body == null() || msg.body.bits() < 32) {
      return;
    }

    slice body = msg.body.beginParse();
    Int op = body.loadUint(32);

    if (op == OP_EXECUTE_DNS_UPDATE) {
      self.handleDnsUpdate(msg, body);
      return;
    }
  }

  fun handleDnsUpdate(msg: InternalMessage, body: slice) {
    self.requireDao(msg.info.src);

    Cell recordCell = body.loadRef();
    Slice recordSlice = recordCell.beginParse();

    Int forwardValue = msg.info.value - msg.info.fwdFee;
    require(forwardValue >= 0, "dns-controller: insufficient value");

    sendRawMessage(
      InternalMessage{
        info: InternalMessageInfo{
          src: myAddress(),
          dest: self.treasuryWallet,
          value: forwardValue,
          ihrDisabled: true,
        },
        body: recordCell,
      },
    );

    DnsUpdateEvent event = DnsUpdateEvent{
      op: OP_EVENT_DNS_UPDATE,
      executor: msg.info.src,
      record: recordSlice,
      forwardedValue: forwardValue,
      quorumPercent: self.quorum,
      timestamp: now(),
    };
    emit(event);
  }

  fun requireDao(sender: Address) {
    require(sender == self.daoMultisig, "dns-controller: unauthorized");
  }

  fun requireBaseWorkchain(addr: Address, err: String) {
    StdAddress components = parseStdAddress(addr.asSlice());
    require(components.workchain == 0, err);
  }

  get fun get_config(): (Address, Address, Int) {
    return (self.daoMultisig, self.treasuryWallet, self.quorum);
  }
}
