import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Text,
    Tailwind,
} from '@react-email/components';
import React from 'react';
import { getCanonicalSiteUrl } from '@/lib/site-url';

interface WelcomeEmailProps {
    username: string;
    baseUrl?: string;
}

export const WelcomeEmail = ({
    username,
    baseUrl = getCanonicalSiteUrl(),
}: WelcomeEmailProps) => {
    const previewText = `Welcome to GitPulse, ${username}!`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-black my-auto mx-auto font-sans text-white">
                    <Container className="border border-solid border-[#3f3f46] rounded-xl my-[40px] mx-auto p-[20px] max-w-[465px] bg-[#18181b]">
                        <Heading className="text-white text-[24px] font-normal text-center p-0 my-[30px] mx-0 font-bold">
                            Welcome to <strong>GitPulse</strong>!
                        </Heading>
                        <Text className="text-[#a1a1aa] text-[14px] leading-[24px]">
                            Hello {username},
                        </Text>
                        <Text className="text-[#a1a1aa] text-[14px] leading-[24px]">
                            We&apos;re excited to have you on board! With your new account, you can confidently analyze any open-source GitHub repository and uncover deep insights.
                        </Text>

                        <Section>
                            <Text className="text-[#a1a1aa] text-[14px] leading-[24px] mb-2 font-semibold">
                                What you get:
                            </Text>
                            <ul className="text-[#a1a1aa] text-[14px] leading-[24px] m-0 p-0 pl-4">
                                <li>Cloud-synced chat history for all scanned repositories.</li>
                                <li><strong>5 Deep Security Scans</strong> per month for comprehensive vulnerability checking.</li>
                                <li>Star and save your favorite repositories to your dashboard.</li>
                            </ul>
                        </Section>

                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Button
                                className="bg-[#8b5cf6] rounded-md text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                                href={`${baseUrl}/dashboard`}
                            >
                                Get Started
                            </Button>
                        </Section>
                        <Hr className="border border-solid border-[#3f3f46] my-[26px] mx-0 w-full" />
                        <Text className="text-[#52525b] text-[12px] leading-[24px]">
                            This email was sent to you because you recently signed up for GitPulse. If you didn&apos;t request this, please ignore this email.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default WelcomeEmail;
