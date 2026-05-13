import {
    Envelope,
    FacebookLogo,
    Globe,
    InstagramLogo,
    LinkedinLogo,
    MapPin,
    Phone,
    TiktokLogo,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useStoreConfig } from '@/api/useMarketing';
import { PROJECT_NAME } from '@/constants/common';
import { ROUTES } from '@/constants/routes';

import styles from './Footer.module.css';

const FALLBACK = {
    contact_email: 'info@qolca.org',
    contact_phone: '',
    contact_address: 'Lima, Perú',
    social_facebook: 'https://www.facebook.com/profile.php?id=61559863243995',
    social_instagram: 'https://www.instagram.com/qolca.peru/',
    social_tiktok: 'https://www.tiktok.com/@qolca.peru',
    social_linkedin: 'https://www.linkedin.com/in/qolca-solutions/',
    social_website: 'https://qolca.org',
    footer_tagline: 'Productos de calidad, seleccionados para ti.',
    footer_byline: 'Hecho con dedicación por Qolca',
    site_name: PROJECT_NAME,
} as const;

function str(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

export function Footer() {
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();
    const { data: config } = useStoreConfig();

    const c = {
        contact_email: str(config?.contact_email, FALLBACK.contact_email),
        contact_phone: str(config?.contact_phone, FALLBACK.contact_phone),
        contact_address: str(config?.contact_address, FALLBACK.contact_address),
        social_facebook: str(config?.social_facebook, FALLBACK.social_facebook),
        social_instagram: str(config?.social_instagram, FALLBACK.social_instagram),
        social_tiktok: str(config?.social_tiktok, FALLBACK.social_tiktok),
        social_linkedin: str(config?.social_linkedin, FALLBACK.social_linkedin),
        social_website: str(config?.social_website, FALLBACK.social_website),
        footer_tagline: str(config?.footer_tagline, FALLBACK.footer_tagline),
        footer_byline: str(config?.footer_byline, FALLBACK.footer_byline),
        site_name: str(config?.site_name, FALLBACK.site_name),
    };

    return (
        <footer className={styles.footer}>
            <div className={styles.top}>
                <div className={styles.container}>
                    <div className={styles.branding}>
                        <Link to={ROUTES.home} className={styles.logo}>
                            <span className={styles.logoText}>{c.site_name}</span>
                        </Link>
                        <p className={styles.tagline}>{c.footer_tagline}</p>
                        <div className={styles.socialIcons}>
                            {!!c.social_facebook && (
                                <a
                                    href={c.social_facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.socialIcon}
                                    aria-label="Facebook"
                                >
                                    <FacebookLogo size={18} />
                                </a>
                            )}
                            {!!c.social_instagram && (
                                <a
                                    href={c.social_instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.socialIcon}
                                    aria-label="Instagram"
                                >
                                    <InstagramLogo size={18} />
                                </a>
                            )}
                            {!!c.social_tiktok && (
                                <a
                                    href={c.social_tiktok}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.socialIcon}
                                    aria-label="TikTok"
                                >
                                    <TiktokLogo size={18} />
                                </a>
                            )}
                            {!!c.social_linkedin && (
                                <a
                                    href={c.social_linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.socialIcon}
                                    aria-label="LinkedIn"
                                >
                                    <LinkedinLogo size={18} />
                                </a>
                            )}
                            {!!c.social_website && (
                                <a
                                    href={c.social_website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.socialIcon}
                                    aria-label={t('footer_website_aria')}
                                >
                                    <Globe size={18} />
                                </a>
                            )}
                        </div>
                    </div>

                    <div className={styles.column}>
                        <h4 className={styles.columnTitle}>{t('footer_store')}</h4>
                        <ul className={styles.linkList}>
                            <li>
                                <Link to={ROUTES.home}>{t('nav_home')}</Link>
                            </li>
                            <li>
                                <Link to={ROUTES.search}>{t('footer_all_products')}</Link>
                            </li>
                            <li>
                                <Link to={ROUTES.cart}>{t('footer_my_cart')}</Link>
                            </li>
                            <li>
                                <Link to={ROUTES.wishlist}>{t('footer_favorites')}</Link>
                            </li>
                        </ul>
                    </div>

                    <div className={styles.column}>
                        <h4 className={styles.columnTitle}>{t('footer_my_account')}</h4>
                        <ul className={styles.linkList}>
                            <li>
                                <Link to={ROUTES.orders}>{t('footer_my_orders')}</Link>
                            </li>
                            <li>
                                <Link to={ROUTES.profile}>{t('footer_my_profile')}</Link>
                            </li>
                            <li>
                                <Link to={ROUTES.login}>{t('footer_login')}</Link>
                            </li>
                            <li>
                                <Link to={ROUTES.register}>{t('footer_register')}</Link>
                            </li>
                        </ul>
                    </div>

                    <div className={styles.column}>
                        <h4 className={styles.columnTitle}>{t('footer_contact')}</h4>
                        <ul className={styles.contactList}>
                            {!!c.contact_email && (
                                <li>
                                    <Envelope size={16} />
                                    <span>{c.contact_email}</span>
                                </li>
                            )}
                            {!!c.contact_phone && (
                                <li>
                                    <Phone size={16} />
                                    <span>{c.contact_phone}</span>
                                </li>
                            )}
                            {!!c.contact_address && (
                                <li>
                                    <MapPin size={16} />
                                    <span>{c.contact_address}</span>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            <div className={styles.bottom}>
                <div className={styles.bottomInner}>
                    <p className={styles.copyright}>
                        &copy; {currentYear} {c.site_name}. {t('footer_rights')}
                    </p>
                    <nav className={styles.legalLinks} aria-label="Legal">
                        <Link to={ROUTES.privacy}>{t('footer_privacy')}</Link>
                        <span aria-hidden="true">·</span>
                        <Link to={ROUTES.terms}>{t('footer_terms')}</Link>
                    </nav>
                    <p className={styles.madeBy}>{c.footer_byline}</p>
                </div>
            </div>
        </footer>
    );
}
