
/**
 * Represents the status of a bid submitted by an agent.
 */
export enum AgentBidStatus {
    /** The bid is waiting for review or approval */
    PENDING = "PENDING",
    /** The bid has been accepted by the customer or administrator */
    ACCEPTED = "ACCEPTED",
    /** The bid has been rejected by the customer or administrator */
    REJECTED = "REJECTED"
}

/**
 * Represents the possible actions recorded in the activity log.
 */
export enum ActivityLogAction {
    /** An agent's bid was approved */
    BID_APPROVED = "BID_APPROVED",
    /** An agent submitted a new bid */
    BID_SUBMITTED = "BID_SUBMITTED",
    /** An existing bid was updated by the agent */
    BID_UPDATED = "BID_UPDATED",
    /** A bid was removed from the system */
    BID_REMOVED = "BID_REMOVED",
    /** A new trip request was created by an employee */
    REQUEST_CREATED = "REQUEST_CREATED",
    /** A trip request was modified */
    REQUEST_UPDATED = "REQUEST_UPDATED",
    /** A trip request was approved by a manager */
    REQUEST_APPROVED = "REQUEST_APPROVED",
    /** A trip request was rejected by a manager */
    REQUEST_REJECTED = "REQUEST_REJECTED",
    /** System settings were changed */
    SETTINGS_CHANGE = "SETTINGS_CHANGE",
    /** A document was uploaded to a request or bid */
    DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED",
    /** The status of a request or fulfillment changed */
    STATUS_CHANGED = "STATUS_CHANGED",
    /** An invoice was generated for a completed request */
    INVOICE_GENERATED = "INVOICE_GENERATED",
    /** An invoice was marked as paid */
    INVOICE_PAID = "INVOICE_PAID"
}
