/**
 * Handle returned by `Property.subscribe`. Calling `unsubscribe` detaches this
 * callback and, when it is the last listener on the underlying MQTT topic,
 * unsubscribes from the broker as well.
 */
export interface Subscription {
  unsubscribe(): void;
}
