import TierOneConsignmentApp from '../tier1_consignment_app';
import TierOneProductLabels from '../tier1_product_labels';

export default function AppIndex() {
  return (
    <TierOneProductLabels>
      <TierOneConsignmentApp />
    </TierOneProductLabels>
  );
}
