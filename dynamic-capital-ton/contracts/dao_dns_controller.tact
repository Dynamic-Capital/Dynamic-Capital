import "@stdlib";

const OP_NEW_PROPOSAL: Int = 0x44445031; // 'DDP1'
const OP_REGISTER_VOTE: Int = 0x44445631; // 'DDV1'
const OP_EXECUTE_PROPOSAL: Int = 0x44444531; // 'DDE1'
const OP_SYNC_MEMBER_POWER: Int = 0x44444d31; // 'DDM1'

struct Proposal {
  id: Int;
  record: Cell;
  approvals: Int;
  executed: Bool;
  quorumPercent: Int;
}

struct DnsUpdateEvent {
  op: Int;
  proposalId: Int;
  approvals: Int;
  quorumPercent: Int;
  record: Slice;
}

contract DaoDnsController {
  daoMultisig: Address;
  treasuryWallet: Address;
  quorumPercent: Int;
  memberPowerTotal: Int;
  currentRecord: Cell;
  proposals: map<Int, Proposal>;

  init(
    dao: Address,
    treasury: Address,
    quorumPercent: Int,
    memberPower: Int,
  ) {
    self.requireBaseWorkchain(dao, "dao-dns: dao workchain");
    self.requireBaseWorkchain(treasury, "dao-dns: treasury workchain");

    Int quorum = quorumPercent;
    if (quorum <= 0) {
      quorum = 60;
    }

    self.daoMultisig = dao;
    self.treasuryWallet = treasury;
    self.quorumPercent = quorum;
    self.memberPowerTotal = memberPower;
    self.currentRecord = beginCell().endCell();
    self.proposals = map();
  }

  receive(msg: InternalMessage) {
    self.requireDao(msg.info.src);

    slice body = msg.body.beginParse();
    Int op = body.loadUint(32);

    if (op == OP_NEW_PROPOSAL) {
      self.handleNewProposal(body);
      return;
    }

    if (op == OP_REGISTER_VOTE) {
      self.handleRegisterVote(body);
      return;
    }

    if (op == OP_EXECUTE_PROPOSAL) {
      self.handleExecute(body);
      return;
    }

    if (op == OP_SYNC_MEMBER_POWER) {
      self.handleSyncMemberPower(body);
      return;
    }

    self.reject(msg, "dao-dns: unsupported op");
  }

  fun handleNewProposal(body: slice) {
    Int proposalId = body.loadUint(64);
    Cell recordCell = body.loadRef();

    Int quorumValue = self.quorumPercent;
    Cell? quorumCell = body.loadMaybeRef();
    if (quorumCell != null()) {
      slice quorumSlice = (quorumCell as Cell).beginParse();
      quorumValue = quorumSlice.loadUint(16);
    }

    if (quorumValue <= 0) {
      quorumValue = self.quorumPercent;
    }

    if (quorumValue > 100) {
      quorumValue = 100;
    }

    Proposal proposal = Proposal{
      id: proposalId,
      record: recordCell,
      approvals: 0,
      executed: false,
      quorumPercent: quorumValue,
    };

    self.proposals.set(proposalId, proposal);
  }

  fun handleRegisterVote(body: slice) {
    Int proposalId = body.loadUint(64);
    Int approvalWeight = body.loadUint(64);

    Proposal proposal = self.requireProposal(proposalId);
    require(!proposal.executed, "dao-dns: executed");

    proposal.approvals = proposal.approvals + approvalWeight;
    self.proposals.set(proposalId, proposal);
  }

  fun handleExecute(body: slice) {
    Int proposalId = body.loadUint(64);
    Proposal proposal = self.requireProposal(proposalId);
    require(!proposal.executed, "dao-dns: already executed");
    require(self.memberPowerTotal > 0, "dao-dns: missing member power");

    Int scaledApprovals = proposal.approvals * 100;
    Int threshold = self.memberPowerTotal * proposal.quorumPercent;
    require(scaledApprovals >= threshold, "dao-dns: quorum not met");

    self.currentRecord = proposal.record;
    proposal.executed = true;
    self.proposals.set(proposalId, proposal);

    self.emitDnsUpdate(proposal);
  }

  fun handleSyncMemberPower(body: slice) {
    Int totalPower = body.loadUint(64);
    self.memberPowerTotal = totalPower;
  }

  fun emitDnsUpdate(proposal: Proposal) {
    DnsUpdateEvent event = DnsUpdateEvent{
      op: OP_EXECUTE_PROPOSAL,
      proposalId: proposal.id,
      approvals: proposal.approvals,
      quorumPercent: proposal.quorumPercent,
      record: proposal.record.beginParse(),
    };

    emit(event);
  }

  fun requireDao(sender: Address) {
    require(sender == self.daoMultisig, "dao-dns: unauthorized");
  }

  fun requireBaseWorkchain(addr: Address, err: String) {
    StdAddress parsed = parseStdAddress(addr.asSlice());
    require(parsed.workchain == 0, err);
  }

  fun requireProposal(id: Int): Proposal {
    Proposal? stored = self.proposals.get(id);
    require(stored != null(), "dao-dns: proposal missing");
    return stored as Proposal;
  }

  get fun get_current_record(): Cell {
    return self.currentRecord;
  }

  get fun get_member_power(): Int {
    return self.memberPowerTotal;
  }

  get fun get_default_quorum(): Int {
    return self.quorumPercent;
  }

  get fun get_proposal(id: Int): (Bool, Int, Int, Bool, Int, Cell) {
    Proposal? stored = self.proposals.get(id);
    if (stored == null()) {
      return (false, 0, 0, false, 0, beginCell().endCell());
    }

    Proposal proposal = stored as Proposal;
    return (
      true,
      proposal.id,
      proposal.approvals,
      proposal.executed,
      proposal.quorumPercent,
      proposal.record,
    );
  }
}
