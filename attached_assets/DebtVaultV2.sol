// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DebtVaultV2
 * @dev A decentralized peer-to-peer lending protocol where loans are represented as tradeable NFTs.
 *
 * CORE FEATURES:
 * • Credit Lines: Lenders configure borrowing limits, APR ranges, and origination fees per borrower/token
 * • NFT-Based Loans: Each loan is an ERC721 token that can be traded on secondary markets
 * • Dynamic Interest Rates: APR varies with utilization (linear interpolation between min/max rates)
 * • Continuous Interest: Interest accrues per second based on time elapsed since last payment
 * • Flexible Repayment: No maturity dates or liquidations - borrowers control repayment timing
 * • Dual Identity System: Original borrower remains tied to credit utilization, current NFT owner handles repayment
 * • Lender Tools: Principal forgiveness, interest forgiveness, and deposit management
 * • Anti-Spam Protection: Global loan count limits prevent DoS attacks
 * • Enumerable NFTs: ERC721Enumerable support for UI integration
 * • APR Protection: Borrowers can set maximum acceptable rates (slippage protection)
 * • Universal Repayment: Anyone can repay any loan
 *
 * ECONOMIC MODEL:
 * • Interest = (outstanding_principal × APR × elapsed_seconds) ÷ (31,536,000 × 10,000)
 * • APR Range: 0.01% to 100% annually (1-10000 basis points)
 * • Origination Fees: 0% to 100% of loan amount (0-10000 basis points), added to principal
 * • Utilization-Based Pricing: Higher borrowing utilization = higher interest rates
 * • No Platform Fees: Pure peer-to-peer lending without protocol revenue
 *
 * SECURITY FEATURES:
 * • Reentrancy Protection: All external calls use CEI pattern with nonReentrant guards
 * • Overflow Protection: Safe arithmetic for all interest calculations
 * • Credit Isolation: Each lender/borrower/token combination has independent credit terms
 * • Transfer Safety: NFT transfers cannot manipulate credit utilization or bypass loan limits
 *
 * SUPPORTED TOKENS:
 * • Standard ERC20 tokens only (no fee-on-transfer or rebasing tokens)
 * • Decimal agnostic: Works with any ERC20 decimal configuration
 * • Token-specific credit lines: Each ERC20 has separate borrowing terms
 */

import "@openzeppelin/contracts@5.0.2/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts@5.0.2/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";

contract DebtVaultV2 is ERC721Enumerable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Custom errors for gas efficiency
    error InsufficientBalance();
    error UnauthorizedBorrower();
    error InvalidAmount();
    error InvalidAPRRange();
    error ExceedsCreditLimit();
    error InsufficientLenderBalance();
    error LoanClosedError();
    error NotLoanOwner();
    error APRTooHigh();
    error APRExceedsLimit();
    error InvalidAddress();
    error NotLender();
    error InvalidAPR();
    error ExceedsOutstanding();
    error TooManyLoans();
    error NonexistentToken();

    // Protocol constants
    uint256 private constant MAX_APR = 10000; // 100.00% maximum rate
    uint256 private constant MIN_APR = 1; // 0.01% minimum rate
    uint256 private constant PRECISION_FACTOR = 1e18; // Calculation precision
    uint256 private constant DAYS_IN_YEAR = 365; // Interest calculation basis
    uint256 private constant SECONDS_IN_YEAR = 365 * 24 * 60 * 60; // 31,536,000
    uint256 private constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    uint256 public constant MAX_LOANS_PER_USER = 50; // DoS protection

    /// @notice Credit line configuration from lender to borrower for specific token
    struct CreditConfig {
        uint256 creditLimit;     // Maximum principal borrower can owe
        uint256 minAPR;          // APR at 0% utilization (basis points)
        uint256 maxAPR;          // APR at 100% utilization (basis points)
        uint256 originationFee;  // One-time fee added to principal (basis points)
    }

    /// @notice Complete loan data for each NFT
    struct LoanNFT {
        address borrower;        // Current NFT owner (handles repayment)
        address lender;          // Fund provider
        address token;           // ERC20 token borrowed
        uint256 principal;       // Original amount + origination fee
        uint256 repaidPrincipal; // Cumulative principal payments
        uint256 forgivenPrincipal; // Principal forgiven by lender
        uint256 apr;             // Fixed annual rate (basis points)
        uint64 startTimestamp;   // Loan creation time
        uint64 lastPaymentTimestamp; // Most recent payment time
        bool closed;             // True when fully satisfied
    }

    // Global state
    uint256 private _loanIdCounter;

    // Core protocol mappings
    mapping(address => mapping(address => mapping(address => CreditConfig))) public creditLines;
    mapping(address => mapping(address => uint256)) public lenderDeposits;
    mapping(uint256 => LoanNFT) public loanById;
    mapping(address => uint256) public userLoanCount;
    mapping(address => uint256) public totalUserLoans;
    mapping(uint256 => address) public originalBorrower;
    mapping(address => uint256[]) public loansByOriginalBorrower;

    // Events
    event Deposited(address indexed lender, address indexed token, uint256 amount);
    event Withdrawn(address indexed lender, address indexed token, uint256 amount);
    event CreditLineUpdated(
        address indexed lender,
        address indexed borrower,
        address indexed token,
        uint256 creditLimit,
        uint256 minAPR,
        uint256 maxAPR,
        uint256 originationFee
    );
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        address token,
        uint256 amount,
        uint256 principal,
        uint256 apr,
        uint256 originationFee
    );
    event LoanRepaid(
        uint256 indexed loanId,
        uint256 amount,
        uint256 interestPaid,
        uint256 principalPaid
    );
    event LoanClosed(uint256 indexed loanId);
    event PrincipalForgiven(uint256 indexed loanId, uint256 amount);
    event InterestForgiven(uint256 indexed loanId);
    event CreditUtilizationUpdated(
        address indexed borrower,
        address indexed lender,
        address indexed token,
        uint256 newUtilization
    );

    constructor() ERC721("Debt Vault V2", "DEBTNFT2") {}

    /// @notice Deposit tokens to enable lending
    function deposit(address token, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (token == address(0)) revert InvalidAddress();

        lenderDeposits[msg.sender][token] += amount;
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, token, amount);
    }

    /// @notice Withdraw available tokens from deposits
    function withdraw(address token, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (lenderDeposits[msg.sender][token] < amount) revert InsufficientBalance();

        lenderDeposits[msg.sender][token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, token, amount);
    }

    /// @notice Configure credit terms for a borrower
    function updateCreditLine(
        address borrower,
        address token,
        uint256 creditLimit,
        uint256 minAPR,
        uint256 maxAPR,
        uint256 originationFee
    ) external {
        if (borrower == address(0) || token == address(0)) revert InvalidAddress();
        if (minAPR > maxAPR) revert InvalidAPRRange();
        if (maxAPR > MAX_APR) revert APRTooHigh();
        if (minAPR < MIN_APR) revert InvalidAPR();
        if (originationFee > MAX_APR) revert APRTooHigh();
        if (creditLimit > 0 && minAPR == 0 && maxAPR == 0) revert InvalidAPRRange();

        creditLines[msg.sender][borrower][token] = CreditConfig({
            creditLimit: creditLimit,
            minAPR: minAPR,
            maxAPR: maxAPR,
            originationFee: originationFee
        });

        emit CreditLineUpdated(msg.sender, borrower, token, creditLimit, minAPR, maxAPR, originationFee);
    }

    /// @notice Borrow tokens against credit line, mint loan NFT
    function borrow(
        address lender,
        address token,
        uint256 amount,
        uint256 maxAPR
    ) external nonReentrant returns (uint256 loanId) {
        if (amount == 0) revert InvalidAmount();
        if (userLoanCount[msg.sender] >= MAX_LOANS_PER_USER) revert TooManyLoans();
        if (totalUserLoans[msg.sender] >= MAX_LOANS_PER_USER) revert TooManyLoans();

        CreditConfig memory config = creditLines[lender][msg.sender][token];
        if (config.creditLimit == 0) revert UnauthorizedBorrower();

        // Calculate fee and total principal
        uint256 originationFee = (amount * config.originationFee) / BASIS_POINTS;
        uint256 totalPrincipal = amount + originationFee;

        // Verify capacity and liquidity
        uint256 currentBorrowing = _getCurrentBorrowing(msg.sender, lender, token);
        if (currentBorrowing + totalPrincipal > config.creditLimit) revert ExceedsCreditLimit();
        if (lenderDeposits[lender][token] < amount) revert InsufficientLenderBalance();

        // Calculate APR based on post-borrow utilization
        uint256 utilization = ((currentBorrowing + totalPrincipal) * PRECISION_FACTOR) / config.creditLimit;
        uint256 apr = config.minAPR + ((utilization * (config.maxAPR - config.minAPR)) / PRECISION_FACTOR);

        if (apr > maxAPR) revert APRExceedsLimit();

        // Create loan NFT
        loanId = _loanIdCounter++;
        _safeMint(msg.sender, loanId);
        originalBorrower[loanId] = msg.sender;
        loansByOriginalBorrower[msg.sender].push(loanId);

        uint64 currentTime = uint64(block.timestamp);
        loanById[loanId] = LoanNFT({
            borrower: msg.sender,
            lender: lender,
            token: token,
            principal: totalPrincipal,
            repaidPrincipal: 0,
            forgivenPrincipal: 0,
            apr: apr,
            startTimestamp: currentTime,
            lastPaymentTimestamp: currentTime,
            closed: false
        });

        // Update accounting and transfer
        lenderDeposits[lender][token] -= amount;
        userLoanCount[msg.sender]++;
        totalUserLoans[msg.sender]++;

        IERC20(token).safeTransfer(msg.sender, amount);

        emit LoanCreated(loanId, msg.sender, lender, token, amount, totalPrincipal, apr, originationFee);
        emit CreditUtilizationUpdated(msg.sender, lender, token, currentBorrowing + totalPrincipal);
    }

    /// @notice Repay loan debt (interest first, then principal)
    function repay(uint256 loanId, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        LoanNFT storage loan = loanById[loanId];
        if (loan.closed) revert LoanClosedError();

        // Calculate debt components
        uint256 outstandingPrincipal = _getOutstandingPrincipal(loan);
        uint256 interest = _calculateInterest(loan);

        // Allocate payment: interest first, then principal
        uint256 remaining = amount;
        uint256 interestPaid = 0;
        uint256 principalPaid = 0;

        if (interest > 0 && remaining > 0) {
            interestPaid = interest <= remaining ? interest : remaining;
            remaining -= interestPaid;
        }

        if (remaining > 0 && outstandingPrincipal > 0) {
            principalPaid = remaining <= outstandingPrincipal ? remaining : outstandingPrincipal;
            loan.repaidPrincipal += principalPaid;
        }

        // Only update timestamp if ALL interest is paid
        if (interestPaid == interest) {
            loan.lastPaymentTimestamp = uint64(block.timestamp);
        }

        // Update lender balance and transfer payment
        lenderDeposits[loan.lender][loan.token] += (principalPaid + interestPaid);
        IERC20(loan.token).safeTransferFrom(msg.sender, address(this), amount);

        _tryCloseLoan(loanId);

        uint256 newUtilization = _getCurrentBorrowing(originalBorrower[loanId], loan.lender, loan.token);
        emit CreditUtilizationUpdated(originalBorrower[loanId], loan.lender, loan.token, newUtilization);
        emit LoanRepaid(loanId, amount, interestPaid, principalPaid);
    }

    /// @notice Lender forgives outstanding principal
    function forgivePrincipal(uint256 loanId, uint256 amount) external {
        LoanNFT storage loan = loanById[loanId];
        if (msg.sender != loan.lender) revert NotLender();
        if (loan.closed) revert LoanClosedError();
        if (amount == 0) revert InvalidAmount();

        uint256 outstandingPrincipal = _getOutstandingPrincipal(loan);
        if (amount > outstandingPrincipal) revert ExceedsOutstanding();
        if (lenderDeposits[loan.lender][loan.token] < amount) revert InsufficientBalance();

        loan.forgivenPrincipal += amount;
        lenderDeposits[loan.lender][loan.token] -= amount;

        emit PrincipalForgiven(loanId, amount);

        uint256 newUtilization = _getCurrentBorrowing(originalBorrower[loanId], loan.lender, loan.token);
        emit CreditUtilizationUpdated(originalBorrower[loanId], loan.lender, loan.token, newUtilization);

        _tryCloseLoan(loanId);
    }

    /// @notice Lender forgives all accrued interest
    function forgiveInterest(uint256 loanId) external {
        LoanNFT storage loan = loanById[loanId];
        if (msg.sender != loan.lender) revert NotLender();
        if (loan.closed) revert LoanClosedError();

        loan.lastPaymentTimestamp = uint64(block.timestamp);
        emit InterestForgiven(loanId);
    }

    /// @notice Handle NFT transfers, update loan ownership
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);

        // Update loan counts during transfers
        if (from != address(0) && to != address(0)) {
            LoanNFT storage loan = loanById[tokenId];
            if (!loan.closed) {
                userLoanCount[from]--;
                userLoanCount[to]++;
                loan.borrower = to;
            }
        }

        return from;
    }

    /// @notice Required by ERC721Enumerable
    function _increaseBalance(address account, uint128 value) internal override {
        super._increaseBalance(account, value);
    }

    /// @notice Required by ERC721Enumerable
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Get outstanding principal (original - repaid - forgiven)
    function _getOutstandingPrincipal(LoanNFT memory loan) internal pure returns (uint256) {
        return loan.principal - loan.repaidPrincipal - loan.forgivenPrincipal;
    }

    /// @notice Get seconds elapsed since last payment
    function _getElapsedSeconds(LoanNFT memory loan) internal view returns (uint256) {
        return block.timestamp - loan.lastPaymentTimestamp;
    }

    /// @notice Calculate accrued interest with overflow protection
    function _calculateInterest(LoanNFT memory loan) internal view returns (uint256 interest) {
        if (loan.closed || loan.apr == 0) return 0;

        uint256 outstanding = _getOutstandingPrincipal(loan);
        uint256 elapsedSeconds = _getElapsedSeconds(loan);

        if (outstanding == 0 || elapsedSeconds == 0) return 0;

        // Prevent overflow: interest = principal × rate × time
        uint256 maxPrincipal = type(uint256).max / loan.apr / elapsedSeconds;
        if (outstanding <= maxPrincipal) {
            interest = (outstanding * loan.apr * elapsedSeconds) / (SECONDS_IN_YEAR * BASIS_POINTS);
        } else {
            // Alternative calculation for large values
            uint256 secondlyRate = (outstanding * loan.apr) / (SECONDS_IN_YEAR * BASIS_POINTS);
            interest = secondlyRate * elapsedSeconds;
        }
    }

    /// @notice Close loan if fully satisfied, burn NFT
    function _tryCloseLoan(uint256 loanId) internal {
        LoanNFT storage loan = loanById[loanId];
        if (loan.repaidPrincipal + loan.forgivenPrincipal >= loan.principal) {
            loan.closed = true;
            userLoanCount[loan.borrower]--;
            totalUserLoans[originalBorrower[loanId]]--; // Fix: decrement total count
            _burn(loanId);
            emit LoanClosed(loanId);
        }
    }

    /// @notice Get current principal owed by original borrower to lender
    function _getCurrentBorrowing(address borrower, address lender, address token) internal view returns (uint256 total) {
        uint256[] memory userLoans = loansByOriginalBorrower[borrower];
        for (uint256 i = 0; i < userLoans.length; i++) {
            uint256 loanId = userLoans[i];
            LoanNFT memory loan = loanById[loanId];
            if (loan.lender == lender && loan.token == token && !loan.closed) {
                total += _getOutstandingPrincipal(loan);
            }
        }
    }

    /// @notice Get loan debt breakdown
    function getOutstandingBalance(uint256 loanId) external view returns (uint256 principal, uint256 interest) {
        LoanNFT memory loan = loanById[loanId];
        principal = _getOutstandingPrincipal(loan);
        interest = _calculateInterest(loan);
    }

    /// @notice Get available borrowing capacity
    function getAvailableCredit(
        address borrower,
        address lender,
        address token
    ) external view returns (uint256 availableCredit) {
        CreditConfig memory config = creditLines[lender][borrower][token];
        uint256 borrowed = _getCurrentBorrowing(borrower, lender, token);
        availableCredit = config.creditLimit > borrowed ? config.creditLimit - borrowed : 0;
    }

    /// @notice Check if NFT exists
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}