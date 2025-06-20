import Image from 'next/image';
import {FC, memo} from 'react';

import {Certification} from '../../../data/dataDef';

const CertificationItem: FC<{certification: Certification}> = memo(({certification}) => {
  const {name, issuer, date, image} = certification;
  return (
    <div className="flex items-center rounded-lg border border-neutral-300 bg-white/20 p-4 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md">
      {/* Image container */}
      <div className="mr-4 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100">
        {image ? (
          <Image
            alt={`${name} certification`}
            className="h-full w-full rounded-lg object-contain"
            height={64}
            src={image}
            width={64}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg bg-neutral-200">
            <span className="text-2xl font-bold text-neutral-500">{issuer.charAt(0)}</span>
          </div>
        )}
      </div>

      {/* Certification info */}
      <div className="flex flex-col justify-center">
        <h3 className="text-lg font-semibold text-neutral-800">{name}</h3>
        <p className="text-sm font-medium text-neutral-600">{issuer}</p>
        <p className="text-sm text-neutral-500">{date}</p>
      </div>
    </div>
  );
});

CertificationItem.displayName = 'CertificationItem';
export default CertificationItem;
