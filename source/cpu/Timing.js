

SNESJS.CPU.prototype.last_cycle = function() {
    if (status.irq_lock == false) {
        status.nmi_pending |= nmi_test();
        status.irq_pending |= irq_test();
        status.interrupt_pending = (status.nmi_pending || status.irq_pending);
    }
}