// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CredChain
 * @notice Draft smart contract for decentralized academic credential verification.
 * @dev Stores identity references, credential hashes, and credential status on-chain.
 *      Complete academic credentials remain off-chain.
 */
contract CredChain {

    // Stores basic information for a registered decentralized identity.
    struct DIDRecord {
        address owner;
        string documentURI;
        bool active;
    }

    // Stores only the on-chain information needed to track a credential.
    struct CredentialRecord {
        bytes32 credentialHash;
        string storageURI;
        address issuer;
        address holder;
        bool revoked;
        uint256 issuedAt;
    }

        // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    // Maps a blockchain address to its registered DID information.
    mapping(address => DIDRecord) public didRecords;

    // Maps a credential identifier to its on-chain credential record.
    mapping(bytes32 => CredentialRecord) public credentials;

    // Tracks universities that are allowed to issue credentials.
    mapping(address => bool) public authorizedIssuers;

    // Address responsible for approving or removing university issuers.
    address public administrator;

    // -------------------------------------------------------------------------
    // Access Control
    // -------------------------------------------------------------------------

    /**
     * @notice Restricts a function to the contract administrator.
     */
    modifier onlyAdministrator() {
        require(msg.sender == administrator, "Only administrator");
        _;
    }

    /**
     * @notice Restricts credential issuance and revocation to approved universities.
     */
    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Issuer not authorized");
        _;
    }

    /**
     * @notice Sets the deploying account as the initial administrator.
     */
    constructor() {
        administrator = msg.sender;
    }

        // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    // Emitted when a user registers or updates a decentralized identity.
    event DIDRegistered(
        address indexed owner,
        string documentURI
    );

    // Emitted when the administrator changes an issuer's authorization status.
    event IssuerAuthorizationUpdated(
        address indexed issuer,
        bool authorized
    );

    // Emitted when an authorized university issues a credential.
    event CredentialIssued(
        bytes32 indexed credentialId,
        address indexed issuer,
        address indexed holder,
        bytes32 credentialHash
    );

    // Emitted when an issued credential is revoked.
    event CredentialRevoked(
        bytes32 indexed credentialId,
        address indexed issuer
    );

    // Emitted when a verifier checks a credential through CredChain.
    event CredentialVerificationLogged(
        bytes32 indexed credentialId,
        address indexed verifier,
        bool valid
    );

        // -------------------------------------------------------------------------
    // DID and Issuer Management
    // -------------------------------------------------------------------------

    /**
     * @notice Registers or updates the caller's decentralized identity.
     * @param documentURI Reference to the caller's off-chain DID document.
     */
    function registerDID(string calldata documentURI) external {
        require(bytes(documentURI).length > 0, "DID document URI required");

        didRecords[msg.sender] = DIDRecord({
            owner: msg.sender,
            documentURI: documentURI,
            active: true
        });

        emit DIDRegistered(msg.sender, documentURI);
    }

    /**
     * @notice Approves or removes a university's permission to issue credentials.
     * @param issuer Address of the university issuer.
     * @param authorized New authorization status.
     */
    function setIssuerAuthorization(
        address issuer,
        bool authorized
    ) external onlyAdministrator {
        require(issuer != address(0), "Invalid issuer address");

        authorizedIssuers[issuer] = authorized;

        emit IssuerAuthorizationUpdated(issuer, authorized);
    }

        // -------------------------------------------------------------------------
    // Credential Management
    // -------------------------------------------------------------------------

    /**
     * @notice Records a newly issued academic credential on-chain.
     * @dev Only an authorized university can issue a credential. The complete
     *      credential remains off-chain; CredChain stores its hash and reference.
     * @param credentialId Unique identifier for the credential.
     * @param holder Address of the student receiving the credential.
     * @param credentialHash Hash of the complete off-chain credential.
     * @param storageURI Reference to the credential's off-chain storage location.
     */
    function issueCredential(
        bytes32 credentialId,
        address holder,
        bytes32 credentialHash,
        string calldata storageURI
    ) external onlyAuthorizedIssuer {
        require(holder != address(0), "Invalid holder address");
        require(credentialId != bytes32(0), "Invalid credential ID");
        require(credentialHash != bytes32(0), "Credential hash required");
        require(credentials[credentialId].issuedAt == 0, "Credential already exists");

        credentials[credentialId] = CredentialRecord({
            credentialHash: credentialHash,
            storageURI: storageURI,
            issuer: msg.sender,
            holder: holder,
            revoked: false,
            issuedAt: block.timestamp
        });

        emit CredentialIssued(
            credentialId,
            msg.sender,
            holder,
            credentialHash
        );
    }

        /**
     * @notice Checks whether a credential matches the supplied hash and is active.
     * @param credentialId Identifier of the credential being verified.
     * @param credentialHash Hash recomputed from the presented off-chain credential.
     * @return valid True when the credential exists, matches the stored hash,
     *         and has not been revoked.
     */
    function verifyCredential(
        bytes32 credentialId,
        bytes32 credentialHash
    ) external returns (bool valid) {
        CredentialRecord storage credential = credentials[credentialId];

        valid =
            credential.issuedAt != 0 &&
            !credential.revoked &&
            credential.credentialHash == credentialHash;

        emit CredentialVerificationLogged(
            credentialId,
            msg.sender,
            valid
        );

        return valid;
    }

    /**
     * @notice Revokes an existing credential.
     * @dev Only the university that originally issued the credential can revoke it.
     * @param credentialId Identifier of the credential to revoke.
     */
    function revokeCredential(
        bytes32 credentialId
    ) external onlyAuthorizedIssuer {
        CredentialRecord storage credential = credentials[credentialId];

        require(credential.issuedAt != 0, "Credential does not exist");
        require(credential.issuer == msg.sender, "Only original issuer can revoke");
        require(!credential.revoked, "Credential already revoked");

        credential.revoked = true;

        emit CredentialRevoked(
            credentialId,
            msg.sender
        );
    }
}