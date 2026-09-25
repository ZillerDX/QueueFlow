using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;

namespace QueueFlow.Infrastructure.Services;

public static class TokenGenerator
{
    public static string GenerateUrlSafeToken(int byteLength = 32)
    {
        byte[] bytes = new byte[byteLength];
        RandomNumberGenerator.Fill(bytes);
        return WebEncoders.Base64UrlEncode(bytes);
    }
}
