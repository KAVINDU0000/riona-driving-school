import Image from "next/image";

/*
 * Picture for a package card. It shows the school logo rather than a vehicle photo, until real package photos are
 * supplied. Pass a photo path per main package in PACKAGE_PHOTOS to replace the logo.
 */
const PACKAGE_PHOTOS: Record<string, string> = {};

export default function PackageArt({ slug, label }: { slug: string; label: string }) {
  const photo = PACKAGE_PHOTOS[slug];

  return (
    <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-gold-soft via-white to-page">
      {photo ? (
        <Image src={photo} alt={label} fill sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
      ) : (
        <Image
          src="/images/logo-riyona-circle.png"
          alt="Riyona Driving School logo"
          width={472}
          height={472}
          className="h-[62%] w-auto object-contain"
        />
      )}
    </div>
  );
}
