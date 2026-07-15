import Link from "next/link";
import type { ReactNode } from "react";
import type { Publication } from "@/app/lib/data";

function venueLabel(publication: Publication) {
    const venue = publication.venue;

    if (venue.includes("ACL")) return "ACL";
    if (venue.includes("CVPR Workshops")) return "CVPR Workshops";
    if (venue.includes("CVPR")) return "CVPR";
    if (venue.includes("Neural Information Processing Systems")) return "NeurIPS";
    if (venue.includes("ICCV")) return "ICCV";
    if (venue.includes("AAAI")) return "AAAI";
    if (venue.includes("ECCV Workshops")) return "ECCV Workshops";
    if (venue.includes("IEEE Access")) return "IEEE Access";
    if (venue.includes("IET Image Processing")) return "IET Image Processing";

    return venue;
}

function ResourceLink({ href, children }: { href: string; children: ReactNode }) {
    if (href.startsWith("/")) {
        return <Link href={href}>{children}</Link>;
    }

    return (
        <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    );
}

export default function PublicationList({ publications }: { publications: Publication[] }) {
    return (
        <div className="publication-list">
            {publications.map((publication) => {
                const projectLink = publication.projectLink ??
                    (publication.link?.startsWith("/") ? publication.link : undefined);
                const paperLink = publication.paperLink ??
                    (publication.link && !publication.link.startsWith("/") ? publication.link : undefined);

                return (
                    <article className="publication-row" key={`${publication.year}-${publication.title}`}>
                        <div className="publication-venue" aria-label={`${venueLabel(publication)} ${publication.year}`}>
                            <strong>{venueLabel(publication)}</strong>
                            <span>{publication.year}</span>
                        </div>

                        <div className="publication-copy">
                            <h3>{publication.title}</h3>
                            <p>
                                {publication.authors.map((author, index) => (
                                    <span key={`${publication.title}-${author}`}>
                                        <span className={author.includes("Junhoo Lee") ? "publication-author--self" : undefined}>
                                            {author}
                                        </span>
                                        {index < publication.authors.length - 1 ? ", " : ""}
                                    </span>
                                ))}
                                {publication.subTag ? ` · ${publication.subTag}` : ""}
                            </p>
                        </div>

                        {(projectLink || paperLink || publication.codeLink) && (
                            <div className="publication-links" aria-label={`Resources for ${publication.title}`}>
                                {projectLink && <ResourceLink href={projectLink}>Project</ResourceLink>}
                                {paperLink && <ResourceLink href={paperLink}>Paper</ResourceLink>}
                                {publication.codeLink && <ResourceLink href={publication.codeLink}>Code</ResourceLink>}
                            </div>
                        )}
                    </article>
                );
            })}
        </div>
    );
}
