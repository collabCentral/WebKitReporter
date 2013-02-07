<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" method="html">
<xsl:template match="/">
    <html>
        <head>
            <style>
                body {
                    font-family: arial;
                }
            </style>
        </head>
        <h3>Bug Details for - <xsl:value-of select="bugzilla/@contributor"/></h3>

        <table border="1" width="100%">
            <xsl:apply-templates/>
        </table>
    </html>
</xsl:template>

<xsl:template match="bug">
    <tr>
        <td><xsl:value-of select="position() div 2"/></td>
        <xsl:apply-templates select="bug_id"/>
        <xsl:apply-templates select="short_desc"/>
    </tr>
</xsl:template>

<xsl:template match="bug_id">
    <td width="10%">
        <a>
            <xsl:attribute name="href">http://bugs.webkit.org/show_bug.cgi?id=<xsl:value-of select="."/></xsl:attribute>
            <xsl:value-of select="."/>
        </a>
    </td>
</xsl:template>

<xsl:template match="short_desc">
    <td><xsl:value-of select="."/></td>
</xsl:template>

</xsl:stylesheet>
