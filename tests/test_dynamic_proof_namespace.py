from dynamic import proof


def test_dynamic_proof_namespace_exports() -> None:
    assert hasattr(proof, "DynamicProofAssembler")
    assert hasattr(proof, "ProofCriterion")
    assert callable(proof.DynamicProofAssembler)
